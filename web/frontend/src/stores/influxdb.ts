import type { Subscription } from "rxjs"

import { HealthAPI } from "@influxdata/influxdb-client-apis"
import { defineStore } from "pinia"
import { from, of, timer } from "rxjs"
import { catchError, map, timeout, switchMap } from "rxjs/operators"

import useInfluxDB from "@/composables/influxdb"
import { LinkStatus } from "./types"

let linkStatusSubscription: Subscription

const useStore = defineStore({
  id: "InfluxDB",

  state: () => ({
    linkStatus: LinkStatus.Unknown,
  }),
})

export default function (): ReturnType<typeof useStore> {
  const store = useStore()

  if (!linkStatusSubscription) {
    const { influxDB } = useInfluxDB()
    const healthAPI = new HealthAPI(influxDB)

    const linkStatus$ = timer(500, 10000).pipe(
      switchMap(() =>
        from(healthAPI.getHealth()).pipe(
          map((health) =>
            health.status === "pass" ? LinkStatus.Up : LinkStatus.Down
          ),
          timeout(1000),
          catchError(() => of(LinkStatus.Down))
        )
      )
    )

    linkStatusSubscription = linkStatus$.subscribe((status) => {
      store.linkStatus = status
    })
  }

  return store
}
