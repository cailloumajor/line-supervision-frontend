use std::collections::HashMap;

use anyhow::anyhow;
use chrono::{DateTime, FixedOffset};
use csv_async::AsyncDeserializer;
use futures::{StreamExt, TryStreamExt};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use surf::http::Method;
use surf::Request as ClientRequest;
use tide::http::Body;
use tide::{Request, StatusCode};

use crate::AppState;

type ChartData = Vec<DataSerie>;

#[derive(Deserialize, Serialize)]
struct DataSerie {
    name: String,
    data: Vec<DataPoint>,
}

#[derive(Deserialize, Serialize)]
struct DataPoint {
    x: String,
    y: (i64, i64),
}

#[derive(Deserialize)]
struct QueryData {
    // Map of machines indexes to their name
    #[serde(with = "indexmap::serde_seq")]
    machines: IndexMap<String, String>,
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
    #[serde(rename(deserialize = "_time"))]
    time: DateTime<FixedOffset>,
    duration: i64,
    machine_name: String,
    state_index: usize,
}

async fn accumulate(mut acc: ChartData, row: ResultRow) -> tide::Result<ChartData> {
    let state = acc
        .get_mut(row.state_index)
        .ok_or_else(|| anyhow!("seed is missing state with index {}", row.state_index))?;
    let start_time = row.time.timestamp_millis();
    let end_time = start_time + row.duration * 1000;
    state.data.push(DataPoint {
        x: row.machine_name,
        y: (start_time, end_time),
    });
    Ok(acc)
}

pub async fn handler(mut req: Request<AppState>) -> tide::Result {
    let query_data: QueryData = req.body_json().await?;
    let state = req.state();
    let mut params = HashMap::new();
    params.insert("bucket", state.config.influxdb_bucket.to_owned().into());
    params.insert(
        "machine_set",
        query_data
            .machines
            .keys()
            .map(|index| index.to_owned())
            .collect::<Vec<_>>()
            .into(),
    );
    params.insert("machines", query_data.machines.into());
    let template = include_str!("machines_state.flux");
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
