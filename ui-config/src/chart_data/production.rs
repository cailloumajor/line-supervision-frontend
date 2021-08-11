use std::collections::HashMap;

use anyhow::anyhow;
use chrono::{DateTime, Duration, FixedOffset, Local, NaiveTime};
use csv_async::AsyncDeserializer;
use futures::{StreamExt, TryStreamExt};
use serde::{Deserialize, Serialize};
use surf::http::Method;
use surf::Request as ClientRequest;
use tide::http::Body;
use tide::{Request, StatusCode};

use super::flux_query::FluxValue;
use crate::AppState;

type ChartData = Vec<DataSerie>;

#[derive(Deserialize, Serialize)]
struct DataSerie {
    name: String,
    data: Vec<(i64, u32)>,
}

#[derive(Deserialize)]
struct QueryData {
    // Array of machines indexes strings
    machines: Vec<String>,
    seed: ChartData,
}

#[derive(Serialize)]
struct InfluxdbQueryParams {
    org: String,
}

#[derive(Default, Deserialize)]
struct InfluxdbErrorResponse {
    message: String,
}

#[derive(Deserialize)]
struct ResultRow {
    #[serde(rename(deserialize = "_start"))]
    start: DateTime<FixedOffset>,
    #[serde(rename(deserialize = "_stop"))]
    stop: DateTime<FixedOffset>,
    total: u32,
}

async fn accumulate(mut acc: ChartData, row: ResultRow) -> tide::Result<ChartData> {
    let serie = acc
        .get_mut(0)
        .ok_or_else(|| anyhow!("missing data serie in seed"))?;
    let start_ms = row.start.timestamp_millis();
    let stop_ms = row.stop.timestamp_millis();
    serie.data.push((start_ms, row.total));
    serie.data.push((stop_ms, row.total));
    Ok(acc)
}

pub async fn handler(mut req: Request<AppState>) -> tide::Result {
    let query_data: QueryData = req.body_json().await?;
    let state = req.state().clone();
    let mut params = HashMap::new();
    params.insert("bucket", state.config.influxdb_bucket.clone().into());
    let start = {
        let now = Local::now();
        let first_shift_end = now.date().and_time(NaiveTime::from_hms(5, 30, 0)).unwrap();
        let shift_duration = Duration::hours(8);
        let start = (0..=3)
            .map(|i| first_shift_end + shift_duration * i)
            .find(|shift_end| now < *shift_end)
            .unwrap();
        start - shift_duration
    };
    params.insert("start", start.into());
    let total_function = query_data
        .machines
        .iter()
        .map(|index| format!("r[\"{}\"]", index))
        .collect::<Vec<_>>()
        .join(" + ");
    let total_function = format!("(r) => {}", total_function);
    params.insert("total_function", FluxValue::RawExpression(total_function));
    params.insert("machine_set", query_data.machines.into());
    let template = include_str!("production.flux");
    let flux_query = state
        .query_builder
        .generate_query(template, &params)
        .unwrap();
    let url = state.config.influxdb_base_url.to_owned() / "api/v2/query";
    let influxdb_req = ClientRequest::builder(Method::Post, url)
        .query(&InfluxdbQueryParams {
            org: state.config.influxdb_org.to_owned(),
        })?
        .content_type("application/vnd.flux")
        .header("Accept", "application/csv")
        .header(
            "Authorization",
            format!("Token {}", &state.config.influxdb_token),
        )
        .body(flux_query);
    let mut influxdb_res = state.client.send(influxdb_req).await?;
    if !influxdb_res.status().is_success() {
        let InfluxdbErrorResponse { message } = influxdb_res.body_json().await.unwrap_or_default();
        return Err(tide::Error::from_str(
            StatusCode::InternalServerError,
            format!("error response from InfluxDB: {}", message),
        ));
    }
    let mut deserializer = AsyncDeserializer::from_reader(influxdb_res);
    let records = deserializer.deserialize::<ResultRow>();
    let chart_data = records
        .map(|r| r.map_err(tide::Error::from))
        .try_fold(query_data.seed, accumulate)
        .await?;
    Ok(Body::from_json(&chart_data)?.into())
}
