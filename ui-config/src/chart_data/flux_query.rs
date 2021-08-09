use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use anyhow::{Context, Result};
use indexmap::IndexMap;
use regex::Regex;

#[derive(Clone, Debug)]
pub enum Comparable {
    String(String),
}

impl Comparable {
    fn to_flux_repr(&self) -> String {
        match self {
            Self::String(s) => format!("\"{}\"", s),
        }
    }
}

impl Hash for Comparable {
    fn hash<H: Hasher>(&self, state: &mut H) {
        match self {
            Self::String(s) => s.hash(state),
        }
    }
}

impl PartialEq for Comparable {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::String(s), Self::String(other_s)) => s == other_s,
        }
    }
}

impl Eq for Comparable {}

impl From<String> for Comparable {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}

#[derive(Debug)]
pub enum FluxValue {
    Comparable(Comparable),
    Array(Vec<FluxValue>),
    Dictionary(IndexMap<Comparable, FluxValue>),
}

impl FluxValue {
    fn to_flux_repr(&self) -> String {
        match self {
            Self::Comparable(comp) => comp.to_flux_repr(),
            Self::Array(arr) => format!(
                "[{}]",
                arr.iter()
                    .map(|e| e.to_flux_repr())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
            Self::Dictionary(inner) => {
                format!(
                    "[{}]",
                    inner
                        .iter()
                        .map(|(k, v)| format!("{}: {}", k.to_flux_repr(), v.to_flux_repr()))
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            }
        }
    }
}

impl From<String> for FluxValue {
    fn from(value: String) -> Self {
        Self::Comparable(value.into())
    }
}

impl<V> From<Vec<V>> for FluxValue
where
    V: Into<FluxValue>,
{
    fn from(value: Vec<V>) -> Self {
        Self::Array(value.into_iter().map(|v| v.into()).collect())
    }
}

impl<K, V> From<IndexMap<K, V>> for FluxValue
where
    K: Into<Comparable>,
    V: Into<FluxValue>,
{
    fn from(value: IndexMap<K, V>) -> Self {
        let inner = value
            .into_iter()
            .map(|(k, v)| (k.into(), v.into()))
            .collect();
        Self::Dictionary(inner)
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
    use std::collections::HashMap;

    use assert_matches::assert_matches;
    use indoc::indoc;
    use test_case::test_case;

    use super::*;

    #[test_case("string".to_string() => Comparable::String("string".to_string()) ; "string")]
    fn comparable_from(from: impl Into<Comparable>) -> Comparable {
        from.into()
    }

    #[test_case(Comparable::String("string".to_string()) => r#""string""# ; "string")]
    fn comparable_to_flux_repr(comparable: Comparable) -> String {
        comparable.to_flux_repr()
    }

    #[test]
    fn flux_value_from_string() {
        let flux_value: FluxValue = "string".to_string().into();
        assert_matches!(flux_value, FluxValue::Comparable(Comparable::String(s)) => {
            assert_eq!(s, "string")
        })
    }

    #[test]
    fn flux_value_from_vec() {
        let flux_value: FluxValue = vec![
            vec!["a".to_string(), "b".to_string()],
            vec!["c".to_string(), "d".to_string()],
        ]
        .into();
        assert_matches!(flux_value, FluxValue::Array(arr) => {
            assert_matches!(&arr[..], [FluxValue::Array(arr1), FluxValue::Array(arr2)] => {
                assert_matches!((&arr1[..], &arr2[..]), (
                    [
                        FluxValue::Comparable(Comparable::String(a)),
                        FluxValue::Comparable(Comparable::String(b))
                    ],
                    [
                        FluxValue::Comparable(Comparable::String(c)),
                        FluxValue::Comparable(Comparable::String(d))
                    ]
                ) => {
                    assert_eq!(a, "a");
                    assert_eq!(b, "b");
                    assert_eq!(c, "c");
                    assert_eq!(d, "d");
                })
            })
        })
    }

    #[test]
    fn flux_value_from_indexmap() {
        let flux_value: FluxValue = vec![("key".to_string(), "value".to_string())]
            .into_iter()
            .collect::<IndexMap<_, _>>()
            .into();
        assert_matches!(flux_value, FluxValue::Dictionary(im) => {
            assert_matches!(im.first(), Some((k, v)) => {
                assert_matches!((k, v), (
                    Comparable::String(key),
                    FluxValue::Comparable(Comparable::String(value))
                ) => {
                    assert_eq!(key, "key");
                    assert_eq!(value, "value");
                })
            })
        })
    }

    #[test]
    fn flux_value_string_to_flux_repr() {
        let comparable = Comparable::String("string".to_string());
        let comp_repr = comparable.to_flux_repr();
        let value = FluxValue::Comparable(comparable);
        assert_eq!(value.to_flux_repr(), comp_repr)
    }

    #[test]
    fn flux_value_array_to_flux_repr() {
        let value = FluxValue::Array(vec![
            FluxValue::Comparable(Comparable::String("val1".to_string())),
            FluxValue::Comparable(Comparable::String("val2".to_string())),
        ]);
        assert_eq!(value.to_flux_repr(), r#"["val1", "val2"]"#)
    }

    #[test]
    fn flux_value_dict_to_flux_repr() {
        let mut dict = IndexMap::new();
        dict.insert(
            Comparable::String("key1".to_string()),
            FluxValue::Comparable(Comparable::String("value1".to_string())),
        );
        dict.insert(
            Comparable::String("key2".to_string()),
            FluxValue::Array(vec![
                FluxValue::Comparable(Comparable::String("value2.1".to_string())),
                FluxValue::Comparable(Comparable::String("value2.2".to_string())),
            ]),
        );
        let value = FluxValue::Dictionary(dict);
        assert_eq!(
            value.to_flux_repr(),
            r#"["key1": "value1", "key2": ["value2.1", "value2.2"]]"#
        )
    }

    const TEMPLATE: &str = indoc! {r#"
        __var__ = "value1"
        Line using placeholder: __var__
    "#};

    #[test]
    fn generate_with_missing_parameter() {
        let builder = QueryBuilder::new();
        let mut params = HashMap::new();
        params.insert("unknown_var", "Value_1".to_string().into());
        assert!(builder.generate_query(TEMPLATE, &params).is_err());
    }

    #[test]
    fn generate_success() {
        let builder = QueryBuilder::new();
        let expected = String::from(indoc! {r#"
            Line using placeholder: "string_value"
        "#});
        let mut params = HashMap::new();
        params.insert("var", "string_value".to_string().into());
        assert_eq!(builder.generate_query(TEMPLATE, &params).unwrap(), expected);
    }
}
