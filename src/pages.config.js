import Home from './pages/Home';
import Interactions from './pages/Interactions';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientDetails from './pages/ClientDetails';
import Schedule from './pages/Schedule';
import AppointmentForm from './pages/AppointmentForm';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Interactions": Interactions,
    "Clients": Clients,
    "ClientForm": ClientForm,
    "ClientDetails": ClientDetails,
    "Schedule": Schedule,
    "AppointmentForm": AppointmentForm,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};