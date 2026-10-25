"use strict";

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

window.GOODFUNDS_API_BASE_URL = isLocal
  ? "http://localhost:3000"
  : "https://goodfunds.onrender.com";