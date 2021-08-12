use std::collections::HashMap;

use anyhow::anyhow;
use chrono::{DateTime, FixedOffset};
use csv_async::AsyncDeserializer;
use futures::{StreamExt, TryStreamExt};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use tide::http::Body;
use tide::Request;

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
    let machine_set = query_data.machines.keys().cloned().collect::<Vec<_>>();
    params.extend([
        ("machine_set", machine_set.into()),
        ("machines", query_data.machines.to_owned().into()),
    ]);
    let influxdb_res = state
        .influxdb_client
        .flux_query(include_str!("machines_state.flux"), params)
        .await?;
    let mut deserializer = AsyncDeserializer::from_reader(influxdb_res);
    let records = deserializer.deserialize::<ResultRow>();
    let chart_data = records
        .map(|r| r.map_err(tide::Error::from))
        .try_fold(query_data.seed, accumulate)
        .await?;
    Ok(Body::from_json(&chart_data)?.into())
}
