use std::collections::{BTreeMap, HashMap};

use anyhow::{Context, Result};
use regex::Regex;

pub enum FluxValue {
    String(String),
    Array(Vec<FluxValue>),
    Map(BTreeMap<String, FluxValue>),
}

impl FluxValue {
    fn to_flux_repr(&self) -> String {
        match self {
            Self::String(s) => format!("\"{}\"", s),
            Self::Array(arr) => format!(
                "[{}]",
                arr.iter()
                    .map(|e| e.to_flux_repr())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
            Self::Map(inner) => {
                format!(
                    "{{{}}}",
                    inner
                        .iter()
                        .map(|(k, v)| format!("\"{}\": {}", k, v.to_flux_repr()))
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            }
        }
    }
}

impl From<String> for FluxValue {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}

impl From<&str> for FluxValue {
    fn from(value: &str) -> Self {
        Self::String(value.to_string())
    }
}

impl<V: Into<FluxValue>> From<Vec<V>> for FluxValue {
    fn from(value: Vec<V>) -> Self {
        Self::Array(value.into_iter().map(|v| v.into()).collect())
    }
}

impl<K: Into<String>, V: Into<FluxValue>> From<BTreeMap<K, V>> for FluxValue {
    fn from(value: BTreeMap<K, V>) -> Self {
        let inner = value
            .into_iter()
            .map(|(k, v)| (k.into(), v.into()))
            .collect();
        Self::Map(inner)
    }
}

pub struct QueryBuilder {
    re: Regex,
}

impl QueryBuilder {
    pub fn new() -> Self {
        let re = Regex::new(r"__(\w+)__").unwrap();
        QueryBuilder { re }
    }

    pub fn generate_query(
        &self,
        template: &str,
        params: &HashMap<&str, FluxValue>,
    ) -> Result<String> {
        // filter out lines defining placeholders variables
        let source = template
            .lines()
            .filter(|l| self.re.find(l.trim_start()).map(|m| m.start()) != Some(0))
            .fold(String::new(), |s, l| s + l + "\n");

        let mut query = String::with_capacity(source.len());
        let mut last_match = 0;
        for caps in self.re.captures_iter(&source) {
            let full_match = caps.get(0).unwrap();
            let param_key = caps.get(1).unwrap().as_str();
            let replacement = params
                .get(param_key)
                .with_context(|| format!("missing `{}` parameter", param_key))?;
            query.push_str(&source[last_match..full_match.start()]);
            query.push_str(&replacement.to_flux_repr());
            last_match = full_match.end();
        }
        query.push_str(&source[last_match..]);

        Ok(query)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::{BTreeMap, HashMap};

    use indoc::indoc;

    const TEMPLATE: &str = indoc! {r#"
        __var1__ = "value1"
        __var2__ = [1, 2]
        __var3__ = {"a": 1, "b": "2"}
        Line using first placeholder: __var1__
        Line with placeholder (__var2__) in the middle
        Line with record placeholder: __var3__
    "#};

    #[test]
    fn generate_with_incomplete_map() {
        let builder = super::QueryBuilder::new();
        let mut params = HashMap::new();
        params.insert("var1", "Value_1".to_string().into());
        assert!(builder.generate_query(TEMPLATE, &params).is_err());
    }

    #[test]
    fn generate_success() {
        let builder = super::QueryBuilder::new();
        let expected = String::from(indoc! {r#"
            Line using first placeholder: "string_value"
            Line with placeholder (["elem1", "elem2"]) in the middle
            Line with record placeholder: {"a": "1", "b": "2"}
        "#});
        let mut params = HashMap::new();
        params.insert("var1", "string_value".into());
        params.insert("var2", vec!["elem1", "elem2"].into());
        params.insert(
            "var3",
            vec![("a", "1"), ("b", "2")]
                .into_iter()
                .collect::<BTreeMap<_, _>>()
                .into(),
        );
        assert_eq!(builder.generate_query(TEMPLATE, &params).unwrap(), expected);
    }
}
