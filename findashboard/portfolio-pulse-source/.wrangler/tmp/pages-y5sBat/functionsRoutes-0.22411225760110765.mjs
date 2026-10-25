import { onRequestDelete as __api_records__date__js_onRequestDelete } from "C:\\Users\\Reinier\\Documents\\GitHub\\adbio\\findashboard\\portfolio-pulse-source\\functions\\api\\records\\[date].js"
import { onRequestGet as __api_records_js_onRequestGet } from "C:\\Users\\Reinier\\Documents\\GitHub\\adbio\\findashboard\\portfolio-pulse-source\\functions\\api\\records.js"
import { onRequestPost as __api_records_js_onRequestPost } from "C:\\Users\\Reinier\\Documents\\GitHub\\adbio\\findashboard\\portfolio-pulse-source\\functions\\api\\records.js"

export const routes = [
    {
      routePath: "/api/records/:date",
      mountPath: "/api/records",
      method: "DELETE",
      middlewares: [],
      modules: [__api_records__date__js_onRequestDelete],
    },
  {
      routePath: "/api/records",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_records_js_onRequestGet],
    },
  {
      routePath: "/api/records",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_records_js_onRequestPost],
    },
  ]