import { defineStore } from "pinia"
import { z } from "zod"

export enum InitStatus {
  Initial,
  Loading,
  Loaded,
  Error,
}

const uiConfigSchema = z.object({
  htmlTitle: z.string(),
  appTitle: z.string(),
  influxdb: z.object({
    org: z.string(),
    bucket: z.string(),
    token: z.string(),
  }),
  synoptics: z.object({
    viewbox: z.object({
      height: z.number(),
      width: z.number(),
    }),
  }),
  machines: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        tagPos: z.object({
          x: z.number(),
          y: z.number(),
        }),
        cardPos: z.object({
          x: z.number(),
          y: z.number(),
        }),
        campaign: z.boolean().default(false),
        production: z.boolean().default(false),
        stateChart: z.boolean().default(false),
      })
    )
    .nonempty(),
})

type UIConfig = z.infer<typeof uiConfigSchema>

interface StateType {
  initStatus: InitStatus
  initError: string
  config: UIConfig
}

export default defineStore({
  id: "uiConfigStore",

  state: (): StateType => ({
    initStatus: InitStatus.Initial,
    initError: "",
    config: {
      htmlTitle: "",
      appTitle: "",
      influxdb: { org: "", bucket: "", token: "" },
      synoptics: { viewbox: { height: 0, width: 0 } },
      machines: [
        {
          name: "",
          path: "",
          tagPos: { x: 0, y: 0 },
          cardPos: { x: 0, y: 0 },
          campaign: false,
          production: false,
          stateChart: false,
        },
      ],
    },
  }),

  getters: {
    loaded: (state) => state.initStatus === InitStatus.Loaded,
    loading: (state) => state.initStatus === InitStatus.Loading,
    machines: (state) =>
      state.config.machines.map((machine, index) => ({ ...machine, index })),
  },

  actions: {
    async init() {
      this.initStatus = InitStatus.Loading
      try {
        const response = await fetch("/ui-config/config")
        if (!response.ok) {
          throw new Error(`fetch: ${response.status} ${response.statusText}`)
        }
        this.config = uiConfigSchema.parse(await response.json())
        this.initStatus = InitStatus.Loaded
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.initError = error.issues.map((issue) => issue.message).join("\n")
        } else {
          this.initError = error.message
        }
        this.initStatus = InitStatus.Error
      }
    },
  },
})
