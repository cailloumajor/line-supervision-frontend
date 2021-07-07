import Vue from "vue"
import VueRouter, { RouteConfig } from "vue-router"

Vue.use(VueRouter)

const Home = () => import(/* webpackChunkName: "home" */ "../views/Home.vue")
const About = () => import(/* webpackChunkName: "about" */ "../views/About.vue")

const routes: Array<RouteConfig> = [
  { path: "/", name: "Home", component: Home },
  { path: "/about", name: "About", component: About },
]

const router = new VueRouter({
  routes,
})

export default router
