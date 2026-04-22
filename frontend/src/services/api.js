import axios from "axios";

const BASE = import.meta.env.VITE_API_URL;
const API = axios.create({ baseURL: `${BASE}/api`, timeout: 300000 });

export const api = {
  search: (keyword, city, max_results = 10) =>
    API.post("/search", { keyword, city, max_results }),

  searchFresh: (keyword, city, max_results = 10) =>
    API.post("/search/fresh", { keyword, city, max_results }),

  getLeads: (city, category) =>
    API.get(`/leads/${city}`, { params: category ? { category } : {} }),

  getCities: () => API.get("/cities"),

  getCategories: (city) => API.get(`/categories/${city}`),

  setShortlist: (leadId, isShortlisted) =>
    API.post(`/leads/${leadId}/shortlist`, { is_shortlisted: isShortlisted }),

  getShortlisted: () => API.get("/shortlisted"),
};
