
const API_BASE_URL = "http://localhost:3000";

const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const authSubmit = document.getElementById("authSubmit");

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const mode = document.body.dataset.authMode || "login";

  const endpoint =
    mode === "signup"
      ? "/api/auth/register"
      : "/api/auth/login";

  const payload =
    mode === "signup"
      ? {
          name: document.getElementById("authName")?.value.trim(),
          email,
          password
        }
      : { email, password };

  authSubmit.disabled = true;
  authMessage.textContent = "Please wait...";

  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        responseText.startsWith("Too many")
          ? "Too many requests. Please wait a minute and try again."
          : "The server returned an invalid response. Please check your backend."
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error || "Login failed. Check your details."
      );
    }

    if (!result.token) {
      throw new Error("Login succeeded but no token was returned.");
    }

    sessionStorage.setItem("goodfundsToken", result.token);

    if (result.user) {
      sessionStorage.setItem(
        "goodfundsUser",
        JSON.stringify(result.user)
      );
    }

    authMessage.textContent = "Login successful! Opening dashboard...";

    window.location.href = "dashboard.html";

  } catch (error) {
    authMessage.textContent =
      error.message || "Unable to connect to GoodFunds.";

  } finally {
    authSubmit.disabled = false;
  }
});
