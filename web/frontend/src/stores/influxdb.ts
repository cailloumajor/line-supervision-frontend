import axios from "axios"
import { createStore } from "pinia"
import { from, of, Subscription, timer } from "rxjs"
import { catchError, mapTo, switchMap } from "rxjs/operators"

import { LinkStatus } from "./types"

const influxHealthURL = "/influx/health"

const linkStatus$ = timer(500, 10000).pipe(
  mapTo(influxHealthURL),
  switchMap(url =>
    from(axios.get(url, { timeout: 1000 })).pipe(
      mapTo(LinkStatus.Up),
      catchError(() => of(LinkStatus.Down))
    )
  )
)

let linkStatusSubscription: Subscription

const useStore = createStore({
  id: "InfluxDB",

  state: () => ({
    linkStatus: LinkStatus.Unknown
  })
})

export default () => {
  const store = useStore()

  if (!linkStatusSubscription) {
    linkStatusSubscription = linkStatus$.subscribe(status => {
      store.state.linkStatus = status
    })
  }

  return store
}
