import {
  FluxTableMetaData,
  HttpError,
  InfluxDB,
  ParameterizedQuery
} from "@influxdata/influxdb-client"
import {
  ComputedRef,
  onMounted,
  onUnmounted,
  ref,
  watch
} from "@vue/composition-api"
import { from, of, Subject, Subscription, timer } from "rxjs"
import {
  catchError,
  map,
  reduce,
  switchMap,
  switchMapTo,
  tap
} from "rxjs/operators"

export type RowObject = ReturnType<FluxTableMetaData["toObject"]>

const url = `http://${window.location.host}/influx`
const queryAPI = new InfluxDB({ url }).getQueryApi("")

export const influxDBName = process.env.VUE_APP_INFLUX_DB_NAME

export function useInfluxDB<T extends Array<unknown>>({
  linkActive,
  queryInterval,
  query,
  seed,
  reducer
}: {
  linkActive: ComputedRef<boolean>
  queryInterval: number
  query: ParameterizedQuery
  seed: T
  reducer: (acc: T, value: RowObject) => T
}) {
  let subscription: Subscription

  const influxData = ref(seed)
  const queryError = ref("")

  const query$ = from(queryAPI.rows(query)).pipe(
    tap({
      error: (err: Error) => {
        if (err instanceof HttpError) {
          queryError.value = `${err.statusCode} ${err.statusMessage}`
          if (err.body) {
            queryError.value += `\n${JSON.parse(err.body).error}`
          }
        } else {
          queryError.value = err.message
        }
      },
      complete: () => {
        queryError.value = ""
      }
    }),
    map(({ values, tableMeta }) => tableMeta.toObject(values)),
    reduce(reducer, seed),
    catchError(() => of(seed))
  )

  const linkActive$ = new Subject<boolean>()

  const linkActiveTimer$ = linkActive$.pipe(
    switchMap(active => (active ? timer(500, queryInterval) : of(-1)))
  )

  watch(linkActive, active => {
    linkActive$.next(active)
  })

  onMounted(() => {
    subscription = linkActiveTimer$.pipe(switchMapTo(query$)).subscribe({
      next: result => {
        influxData.value = [...result]
      }
    })
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return {
    influxData,
    queryError
  }
}
