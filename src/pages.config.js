/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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
import DatabaseCleaning from './pages/DatabaseCleaning';
import GoogleSheetsSync from './pages/GoogleSheetsSync';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import Interactions from './pages/Interactions';
import MigrationControl from './pages/MigrationControl';
import Notes from './pages/Notes';
import Reports from './pages/Reports';
import SalesPipeline from './pages/SalesPipeline';
import Schedule from './pages/Schedule';
import Tasks from './pages/Tasks';
import CertificateRenewals from './pages/CertificateRenewals';
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
    "DatabaseCleaning": DatabaseCleaning,
    "GoogleSheetsSync": GoogleSheetsSync,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Interactions": Interactions,
    "MigrationControl": MigrationControl,
    "Notes": Notes,
    "Reports": Reports,
    "SalesPipeline": SalesPipeline,
    "Schedule": Schedule,
    "Tasks": Tasks,
    "CertificateRenewals": CertificateRenewals,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};