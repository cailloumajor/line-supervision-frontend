import {
  FluxTableMetaData,
  HttpError,
  ParameterizedQuery
} from "@influxdata/influxdb-client-browser"
import {
  onMounted,
  onUnmounted,
  ref,
  toRefs,
  watch
} from "@vue/composition-api"
import { defer, of, Subject, Subscription, timer } from "rxjs"
import {
  catchError,
  map,
  reduce,
  switchMap,
  switchMapTo,
  tap
} from "rxjs/operators"

import { influxDB } from "@/common"
import { frontendConfig } from "@/config"
import useInfluxDBStore from "@/stores/influxdb"
import { LinkStatus } from "@/stores/types"

type RowObject = ReturnType<FluxTableMetaData["toObject"]>

const { influxdbOrg, influxdbBucket } = frontendConfig
const queryAPI = influxDB.getQueryApi(influxdbOrg)

export interface Options<T> {
  queryInterval: number
  generateQuery: (bucket: string) => ParameterizedQuery
  seed: T
  reducer: (acc: T, value: RowObject) => T
}

export default <T extends Array<unknown>>(opts: Options<T>) => {
  let subscription: Subscription

  const influxDBStore = useInfluxDBStore()

  const { linkStatus } = toRefs(influxDBStore.$state)
  const influxData = ref(opts.seed)
  const loading = ref(false)
  const queryError = ref("")

  const query$ = defer(() => {
    loading.value = true
    return queryAPI.rows(opts.generateQuery(influxdbBucket))
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
      }
    }),
    map(({ values, tableMeta }) => tableMeta.toObject(values)),
    reduce(opts.reducer, opts.seed),
    catchError(() => of(opts.seed))
  )

  const linkStatusSubject = new Subject<LinkStatus>()
  const influxData$ = linkStatusSubject.pipe(
    switchMap(status =>
      status === LinkStatus.Up
        ? timer(500, opts.queryInterval).pipe(switchMapTo(query$))
        : of(opts.seed).pipe(
            tap(() => {
              queryError.value = ""
            })
          )
    )
  )

  watch(linkStatus, status => {
    linkStatusSubject.next(status)
  })

  onMounted(() => {
    subscription = influxData$.subscribe({
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
    loading,
    queryError
  }
}
