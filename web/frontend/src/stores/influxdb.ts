import { defineStore } from "pinia"
import { catchError, map, of, timer, timeout, switchMap } from "rxjs"
import { fromFetch } from "rxjs/fetch"

import { apiUrl } from "@/common"

import { LinkStatus } from "./types"

interface StateType {
  linkStatus: LinkStatus
}

const useStore = defineStore({
  id: "chartData",

  state: (): StateType => ({
    linkStatus: LinkStatus.Unknown,
  }),
})

let initialized = false

export default function (): ReturnType<typeof useStore> {
  const store = useStore()

  if (!initialized) {
    initialized = true

    const influxdbStatus$ = timer(2000, 10000).pipe(
      switchMap(() =>
        fromFetch(apiUrl + "/influxdb-ready").pipe(
          map((response) => (response.ok ? LinkStatus.Up : LinkStatus.Down)),
          timeout(1000),
          catchError(() => of(LinkStatus.Down))
        )
      )
    )

    influxdbStatus$.subscribe((status) => {
      store.linkStatus = status
    })
  }

  return store
}
