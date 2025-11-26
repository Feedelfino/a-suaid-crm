import Home from './pages/Home';
import Interactions from './pages/Interactions';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientDetails from './pages/ClientDetails';
import Schedule from './pages/Schedule';
import AppointmentForm from './pages/AppointmentForm';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Reports from './pages/Reports';
import DataImport from './pages/DataImport';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Interactions": Interactions,
    "Clients": Clients,
    "ClientForm": ClientForm,
    "ClientDetails": ClientDetails,
    "Schedule": Schedule,
    "AppointmentForm": AppointmentForm,
    "Dashboard": Dashboard,
    "Campaigns": Campaigns,
    "Reports": Reports,
    "DataImport": DataImport,
    "Admin": Admin,
    "Tasks": Tasks,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};