import type { InfluxDB, QueryApi } from "@influxdata/influxdb-client-browser"

import {
  FluxTableMetaData,
  HttpError,
  ParameterizedQuery,
  Row,
} from "@influxdata/influxdb-client-browser"
import {
  onMounted,
  onUnmounted,
  Ref,
  ref,
  toRefs,
  watch,
} from "@vue/composition-api"
import { defer, Observable, of, Subject, Subscription, timer } from "rxjs"
import {
  catchError,
  map,
  reduce,
  switchMap,
  switchMapTo,
  tap,
} from "rxjs/operators"

import useInfluxDB from "@/composables/influxdb"
import useInfluxDBStore from "@/stores/influxdb"
import { LinkStatus } from "@/stores/types"
import useUiConfigStore from "@/stores/ui-config"

type RowObject = ReturnType<FluxTableMetaData["toObject"]>

let queryAPI: QueryApi | undefined

export interface Options<T> {
  influxDB: InfluxDB
  queryInterval: number
  generateQuery: (bucket: string) => ParameterizedQuery
  seed: T
  reducer: (acc: T, value: RowObject) => T
}

export default function <T extends Array<unknown>>(
  opts: Options<T>
): {
  influxData: Ref<T>
  loading: Ref<boolean>
  queryError: Ref<string>
} {
  let subscription: Subscription

  const { influxDB } = useInfluxDB()
  const influxDBStore = useInfluxDBStore()
  const uiConfig = useUiConfigStore()
  const { org, bucket } = uiConfig.config.influxdb

  const { linkStatus } = toRefs(influxDBStore.$state)
  const influxData = ref(opts.seed) as Ref<T>
  const loading = ref(false)
  const queryError = ref("")

  const getQueryApi = () => {
    if (queryAPI === undefined) {
      queryAPI = influxDB.getQueryApi(org)
    }
    return queryAPI
  }

  const query$ = defer(() => {
    loading.value = true
    const rowsObservable = getQueryApi().rows(opts.generateQuery(bucket))
    return rowsObservable as Observable<Row>
  }).pipe(
    tap({
      error: (err: Error) => {
        loading.value = false
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
        loading.value = false
        queryError.value = ""
      },
    }),
    map(({ values, tableMeta }) => tableMeta.toObject(values)),
    reduce(opts.reducer, opts.seed),
    catchError(() => of(opts.seed))
  )

  const linkStatusSubject = new Subject<LinkStatus>()
  const influxData$ = linkStatusSubject.pipe(
    switchMap((status) =>
      status === LinkStatus.Up
        ? timer(500, opts.queryInterval).pipe(switchMapTo(query$))
        : of(opts.seed).pipe(
            tap(() => {
              queryError.value = ""
            })
          )
    )
  )

  watch(linkStatus, (status) => {
    linkStatusSubject.next(status)
  })

  onMounted(() => {
    subscription = influxData$.subscribe({
      next: (result) => {
        influxData.value = [...result] as T
      },
    })
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return {
    influxData,
    loading,
    queryError,
  }
}
