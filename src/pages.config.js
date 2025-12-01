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
import AccessPending from './pages/AccessPending';
import AccessDenied from './pages/AccessDenied';
import SalesPipeline from './pages/SalesPipeline';
import Notes from './pages/Notes';
import Chat from './pages/Chat';
import Renewals from './pages/Renewals';
import AgentPerformance from './pages/AgentPerformance';
import HelpCenter from './pages/HelpCenter';
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
    "AccessPending": AccessPending,
    "AccessDenied": AccessDenied,
    "SalesPipeline": SalesPipeline,
    "Notes": Notes,
    "Chat": Chat,
    "Renewals": Renewals,
    "AgentPerformance": AgentPerformance,
    "HelpCenter": HelpCenter,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};