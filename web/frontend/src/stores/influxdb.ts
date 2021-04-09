import { HealthAPI } from "@influxdata/influxdb-client-apis"
import { defineStore } from "pinia"
import { from, of, Subscription, timer } from "rxjs"
import { catchError, map, timeout, switchMap } from "rxjs/operators"

import { influxDB } from "@/config"
import { LinkStatus } from "./types"

const healthAPI = new HealthAPI(influxDB)

const linkStatus$ = timer(500, 10000).pipe(
  switchMap(() =>
    from(healthAPI.getHealth()).pipe(
      map(health =>
        health.status === "pass" ? LinkStatus.Up : LinkStatus.Down
      ),
      timeout(1000),
      catchError(() => of(LinkStatus.Down))
    )
  )
)

let linkStatusSubscription: Subscription

const useStore = defineStore({
  id: "InfluxDB",

  state: () => ({
    linkStatus: LinkStatus.Unknown
  })
})

export default () => {
  const store = useStore()

  if (!linkStatusSubscription) {
    linkStatusSubscription = linkStatus$.subscribe(status => {
      store.linkStatus = status
    })
  }

  return store
}
