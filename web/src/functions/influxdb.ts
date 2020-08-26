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
  watchEffect
} from "@vue/composition-api"
import {
  EMPTY,
  from,
  PartialObserver,
  Subject,
  Subscription,
  timer
} from "rxjs"
import { map, switchMap, switchMapTo, tap } from "rxjs/operators"

export type RowObject = ReturnType<FluxTableMetaData["toObject"]>

const url = `http://${window.location.host}/influx`
const queryAPI = new InfluxDB({ url }).getQueryApi("")

export const influxDBName = process.env.VUE_APP_INFLUX_DB_NAME

export function useInfluxDB({
  query,
  observer,
  linkActive,
  queryInterval
}: {
  query: ParameterizedQuery
  observer: PartialObserver<RowObject>
  linkActive: ComputedRef<boolean>
  queryInterval: number
}) {
  let subscription: Subscription

  const queryError = ref("")

  const query$ = from(queryAPI.rows(query)).pipe(
    map(({ values, tableMeta }) => tableMeta.toObject(values)),
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
    tap(observer)
  )

  const linkActive$ = new Subject<boolean>()

  const linkActiveTimer$ = linkActive$.pipe(
    switchMap(active => (active ? timer(500, queryInterval) : EMPTY))
  )

  watchEffect(() => {
    linkActive$.next(linkActive.value)
  })

  onMounted(() => {
    subscription = linkActiveTimer$.pipe(switchMapTo(query$)).subscribe()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return {
    queryError
  }
}
