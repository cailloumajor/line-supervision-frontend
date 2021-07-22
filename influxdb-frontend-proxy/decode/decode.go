package decode

import (
	"errors"
	"reflect"

	"github.com/influxdata/influxdb-client-go/v2/api/query"
)

// FieldTag represents the name of the tag each field of the struct must be annotated with.
const FieldTag = "influxfield"

var (
	// ErrBadTargetType is returned by Unmarshal when the type of the target is not as expected.
	ErrBadTargetType = errors.New("Unmarshal(): target must be a pointer to a flat struct")
)

// FieldError is returned by Unmarshal when an error occurs on a struct's field.
type FieldError struct {
	Field   reflect.StructField
	Message string
}

func (m *FieldError) Error() string {
	return "Unmarshal(): error on field `" + m.Field.Name + "`: " + m.Message
}

type setValue func(reflect.Value, interface{}) error

var setValueFor = map[reflect.Kind]setValue{
	reflect.Bool: func(t reflect.Value, v interface{}) error {
		b, ok := v.(bool)
		t.SetBool(b)
	},
}

// Unmarshal decodes a record from a query result into the structure pointed
// to by target, that must be flat.
func Unmarshal(record *query.FluxRecord, target interface{}) error {
	tv := reflect.ValueOf(target)
	if tv.Kind() != reflect.Ptr {
		return ErrBadTargetType
	}

	dt := tv.Elem()
	if dt.Kind() != reflect.Struct {
		return ErrBadTargetType
	}

	for i := 0; i < dt.NumField(); i++ {
		fv := dt.Field(i)
		// ft := fv.Elem().Type()
		fi := dt.Type().Field(i)

		if fv.Kind() != reflect.Ptr {
			return &FieldError{fi, "must be a pointer"}
		}

		tag, ok := fi.Tag.Lookup(FieldTag)
		if !ok {
			return &FieldError{fi, "missing `" + FieldTag + "` tag"}
		}

		val := record.ValueByKey(tag)

	}

	return nil
}
