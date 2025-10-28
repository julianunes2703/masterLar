// src/components/DashboardLayout.jsx
import React, { useState } from "react";
import MasterLarDashboard from "../Filiais/Masterlar";

import "./Layout.css";
import CentrosDeCusto from "../CentroCusto/CentroCusto";



export default function DashboardLayout() {
  const [selectedMenu, setSelectedMenu] = useState("obras");

  const renderContent = () => {
    switch (selectedMenu) {
    
      case "filial":
       return  <MasterLarDashboard/>;

       case "centroCusto":
        return <CentrosDeCusto/>

        

      default: <MasterLarDashboard/>
         
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>MasterLar</h2>
          <h3 className="blue">By Consulting Blue</h3>
        </div>

        <nav>
          <ul>
            {/* Seção Financeiro */}
            <li className="submenu-title"> MasterLar</li>
            <li
              className={selectedMenu === "filial" ? "active" : ""}
              onClick={() => setSelectedMenu("filial")}
            >
              • Filiais
            </li>

             <li
              className={selectedMenu === "centroCusto" ? "active" : ""}
              onClick={() => setSelectedMenu("centroCusto")}
            >
              • Centro de Custo
            </li>
          
          
          </ul>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="dashboard-content">{renderContent()}</main>
    </div>
  );
}