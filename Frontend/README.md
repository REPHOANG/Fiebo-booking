# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

📁 Root
🔹 node_modules/

Chứa toàn bộ thư viện cài bằng npm

Không chỉnh sửa

Không push lên Git

🔹 public/

Chứa file tĩnh (static files)

Ví dụ:

index.html

favicon

ảnh không cần import

React sẽ render vào <div id="root"></div> trong file này.

📁 src/ (quan trọng nhất)

Toàn bộ code chính nằm ở đây.

🔹 assets/

Chứa tài nguyên:

images

icons

fonts

svg

Ví dụ:

assets/
  logo.png
  background.jpg

🔹 components/

Chứa các component tái sử dụng.

common/

Component dùng chung:

Button

Input

Modal

Spinner

layout/

Component bố cục:

Header

Footer

Sidebar

MainLayout

🔹 config/

Chứa cấu hình:

API URL

ENV config

axios config

app settings

Ví dụ:

export const API_BASE_URL = "http://localhost:5000";

🔹 constants/

Chứa hằng số:

Role

Status

Route name

Message

Ví dụ:

export const ROLE_ADMIN = "ADMIN";

🔹 hooks/

Custom React Hooks.

Ví dụ:

useAuth.js
useDebounce.js
useFetch.js


Giúp tái sử dụng logic.

🔹 lib/

Chứa helper function hoặc thư viện tự viết.

Ví dụ:

formatDate.js
validateEmail.js

🔹 pages/

Mỗi file đại diện cho 1 trang.

Ví dụ:

HomePage.jsx
LoginPage.jsx
ProductPage.jsx


👉 Router sẽ trỏ vào đây.

🔹 routers/

Cấu hình React Router.

Ví dụ:

AppRouter.jsx
ProtectedRoute.jsx

🔹 services/

Gọi API backend.

Ví dụ:

authService.js
userService.js
productService.js


Thường dùng axios.

🔹 theme/

Chứa cấu hình giao diện:

Màu sắc

Typography

Material UI theme

Dark/Light mode config

📄 File chính
🔹 App.js

Component gốc.
Thường chứa:

Router

Layout chính

🔹 index.js

Entry point.
Render React vào DOM:

ReactDOM.createRoot(document.getElementById('root')).render(<App />);