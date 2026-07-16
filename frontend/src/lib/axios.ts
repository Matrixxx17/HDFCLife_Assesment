import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Response interceptor to handle redirecting on unauthorized (401) sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path.startsWith("/admin") && path !== "/admin/login") {
            window.location.href = "/admin/login?expired=true";
          } else if (path.startsWith("/agent") && path !== "/agent/login") {
            window.location.href = "/agent/login?expired=true";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
