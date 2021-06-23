use std::env;
use std::fs;

use actix_web::{get, middleware::Logger, web, App, HttpResponse, HttpServer, Responder};
use anyhow::{Context, Result};
use env_logger::Builder;
use log::LevelFilter;

use ui_config::{replace_env_vars, toml_to_json};

const TEMPLATE_ENV_VAR: &str = "CONFIG_TEMPLATE_PATH";

struct AppState {
    config_json: String,
}

#[get("/")]
async fn index(data: web::Data<AppState>) -> impl Responder {
    HttpResponse::Ok()
        .content_type("application/json")
        .body(&data.config_json)
}

#[actix_web::main]
async fn main() -> Result<()> {
    Builder::new().filter_level(LevelFilter::Info).init();
    let template_path = env::var(TEMPLATE_ENV_VAR).unwrap_or("config.toml".into());
    let raw_toml = fs::read_to_string(&template_path)
        .with_context(|| format!("Failed reading {}", template_path))?;
    let raw_json = toml_to_json(&raw_toml)
        .with_context(|| format!("failed to convert {} to JSON", template_path))?;
    let config_json = replace_env_vars(&raw_json).with_context(|| {
        format!(
            "failed to expand environment variables after converting {} to JSON",
            template_path
        )
    })?;
    let state = web::Data::new(AppState { config_json });

    HttpServer::new(move || {
        let logger = Logger::default();
        App::new()
            .app_data(state.clone())
            .wrap(logger)
            .service(index)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await?;

    Ok(())
}
