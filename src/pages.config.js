import AccessDenied from './pages/AccessDenied';
import AccessPending from './pages/AccessPending';
import Admin from './pages/Admin';
import AgentPerformance from './pages/AgentPerformance';
import AppointmentForm from './pages/AppointmentForm';
import Campaigns from './pages/Campaigns';
import Chat from './pages/Chat';
import ClientDetails from './pages/ClientDetails';
import ClientForm from './pages/ClientForm';
import Dashboard from './pages/Dashboard';
import DataImport from './pages/DataImport';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import Interactions from './pages/Interactions';
import MigrationControl from './pages/MigrationControl';
import Notes from './pages/Notes';
import Reports from './pages/Reports';
import SalesPipeline from './pages/SalesPipeline';
import Schedule from './pages/Schedule';
import Tasks from './pages/Tasks';
import Clients from './pages/Clients';
import Renewals from './pages/Renewals';
import RenewalsDashboard from './pages/RenewalsDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessDenied": AccessDenied,
    "AccessPending": AccessPending,
    "Admin": Admin,
    "AgentPerformance": AgentPerformance,
    "AppointmentForm": AppointmentForm,
    "Campaigns": Campaigns,
    "Chat": Chat,
    "ClientDetails": ClientDetails,
    "ClientForm": ClientForm,
    "Dashboard": Dashboard,
    "DataImport": DataImport,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Interactions": Interactions,
    "MigrationControl": MigrationControl,
    "Notes": Notes,
    "Reports": Reports,
    "SalesPipeline": SalesPipeline,
    "Schedule": Schedule,
    "Tasks": Tasks,
    "Clients": Clients,
    "Renewals": Renewals,
    "RenewalsDashboard": RenewalsDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};