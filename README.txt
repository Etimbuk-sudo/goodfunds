GOODFUNDS SEPARATED FILES

Files:
- dashboard.html: GoodFunds dashboard shell
- login.html: login page
- signup.html: signup page
- css/app.css: shared styles
- js/app.js: dashboard features and interactions
- js/auth.js: login/signup backend connection

Setup:
1. Keep this folder structure unchanged.
2. Upload these files to the same frontend hosting folder (Vercel static site).
3. Open login.html or your site's root page. After successful login/signup, the app redirects to dashboard.html.
4. API URL used by auth.js: https://goodfunds.onrender.com

Important:
- The dashboard's financial figures are local demo records; they do not move real money.
- Login/signup require the backend endpoints /api/auth/login and /api/auth/register to be working.
- This is a frontend prototype, not a production-ready banking application.
