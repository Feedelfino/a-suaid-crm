import AccessDenied from './pages/AccessDenied';
import AccessPending from './pages/AccessPending';
import Admin from './pages/Admin';
import AgentPerformance from './pages/AgentPerformance';
import AppointmentForm from './pages/AppointmentForm';
import Campaigns from './pages/Campaigns';
import Chat from './pages/Chat';
import ClientDetails from './pages/ClientDetails';
import ClientForm from './pages/ClientForm';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DataImport from './pages/DataImport';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import Interactions from './pages/Interactions';
import MigrationControl from './pages/MigrationControl';
import Notes from './pages/Notes';
import Renewals from './pages/Renewals';
import RenewalsDashboard from './pages/RenewalsDashboard';
import Reports from './pages/Reports';
import SalesPipeline from './pages/SalesPipeline';
import Schedule from './pages/Schedule';
import Tasks from './pages/Tasks';
import RenewalManagement from './pages/RenewalManagement';
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
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DataImport": DataImport,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Interactions": Interactions,
    "MigrationControl": MigrationControl,
    "Notes": Notes,
    "Renewals": Renewals,
    "RenewalsDashboard": RenewalsDashboard,
    "Reports": Reports,
    "SalesPipeline": SalesPipeline,
    "Schedule": Schedule,
    "Tasks": Tasks,
    "RenewalManagement": RenewalManagement,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};