import Layout from "../component/Layout/Layout";
import Admin from "../Pages/Admin/index";
import Login from '../pages/Login.js';
import OwnerLogin from '../pages/OwnerLogin.jsx';
import Register from '../pages/Register.jsx';
import Home from "../component/heroComponent/Home.jsx";
import Banner from "../component/heroComponent/Banner.jsx";
import Query from "../component/QueryTicket/App.jsx";
import BuyProduct from "../component/buyProduct/App.jsx";
import Firm from "../component/confirm/Firm.jsx";
import { ForgotPassword } from '../pages/ForgotPassword.jsx';
import { ResetPassword } from '../pages/ResetPassword.jsx';
import Profile from '../pages/Profile/Profile.jsx';
import TransactionHistory from '../pages/Profile/TransactionHistory.jsx';

export const publicRoutes = [
  {
    path: "/",
    element: <Layout />,
    children: [{ path: "", element: <Home /> }],
  },
  { path: "/login", element: <Login /> },
  { path: "/owner/login", element: <OwnerLogin /> },
  { path: "/register", element: <Register /> },
  { path: '/forgot-password',element: <ForgotPassword />},
  { path: '/reset-password',element: <ResetPassword />},
  { path: '/profile',element: <Profile />},
  { path: '/transactions',element: <TransactionHistory />},
  { path: "/admin", element: <Admin /> },
  { path: "/banner", element: <Banner /> },
  { path: "/query", element: <Query /> },
  { path: "/checkout", element: <BuyProduct /> },
  { path: "/confirm", element: <Firm /> },
];
