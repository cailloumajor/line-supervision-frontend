use std::sync::Arc;

use anyhow::Context;
use surf::Client;

mod chart_data;
mod config;
mod handlers;
mod ui_customization;

use chart_data::flux_query::QueryBuilder;
use config::Config;
use ui_customization::get_ui_customization;

#[derive(Clone)]
pub struct AppState {
    client: Client,
    config: Arc<Config>,
    query_builder: Arc<QueryBuilder>,
    ui_customization_json: Arc<String>,
}

#[async_std::main]
async fn main() -> tide::Result<()> {
    tide::log::start();

    let client = Client::new();
    let config = Config::get()?;
    let logo_file = config.logo_file.clone();
    let ui_customization_json = get_ui_customization(&config)?;
    let query_builder = QueryBuilder::new();
    let state = AppState {
        client,
        config: Arc::new(config),
        query_builder: Arc::new(query_builder),
        ui_customization_json: Arc::new(ui_customization_json),
    };

    let mut app = tide::with_state(state);
    app.at("/health").get(handlers::health);
    app.at("/logo")
        .serve_file(&logo_file)
        .with_context(|| format!("failed to serve {}", logo_file.display()))?;
    app.at("/ui-customization").get(handlers::ui_customization);
    app.at("/influxdb-ready").get(handlers::influxdb_ready);
    app.at("/machines_state")
        .post(chart_data::machine_state::handler);

    app.listen("0.0.0.0:8080").await?;
    Ok(())
}
