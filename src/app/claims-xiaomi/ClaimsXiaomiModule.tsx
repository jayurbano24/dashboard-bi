'use client';

import React, { useState } from 'react';
import { Card, Title, Text, Tab, TabList, TabGroup, TabPanels, TabPanel } from '@tremor/react';
import ModelsCatalog from './components/ModelsCatalog';
import ClaimsManager from './components/ClaimsManager';
import FallasCatalog from './components/FallasCatalog';
import VerdictsCatalog from './components/VerdictsCatalog';

export default function ClaimsXiaomiModule({ ordersData = [] }: { ordersData?: any[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header del Módulo */}
        <div className="flex items-center justify-between">
          <div>
            <Title className="text-3xl text-orange-600 font-bold">Módulo Claims Xiaomi</Title>
            <Text className="text-slate-500">
              Sistema integral de gestión, validación, catálogos y generación de reportes ISP.
            </Text>
          </div>
          <a
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm"
          >
            ← Volver al Dashboard General
          </a>
        </div>

        {/* Estructura de Pestañas (Tabs) */}
        <Card className="p-0 overflow-hidden shadow-sm">
          <TabGroup index={selectedIndex} onIndexChange={setSelectedIndex}>
            <div className="border-b bg-white px-4 pt-4">
              <TabList className="flex gap-4">
                <Tab className="text-sm font-semibold pb-2">Gestión de Claims</Tab>
                <Tab className="text-sm font-semibold pb-2">Modelos</Tab>
                <Tab className="text-sm font-semibold pb-2">Veredictos (Reglas)</Tab>
                <Tab className="text-sm font-semibold pb-2">Fallas (Nivel 3)</Tab>
              </TabList>
            </div>

            <div className="p-6 bg-slate-50 min-h-[600px]">
              <TabPanels>
                {/* 1. Gestión de Claims */}
                <TabPanel>
                  <ClaimsManager ordersData={ordersData} />
                </TabPanel>

                {/* 2. Catálogo de Modelos */}
                <TabPanel>
                  <ModelsCatalog />
                </TabPanel>

                {/* 3. Catálogo de Veredictos */}
                <TabPanel>
                  <VerdictsCatalog />
                </TabPanel>

                {/* 4. Catálogo de Fallas */}
                <TabPanel>
                  <FallasCatalog />
                </TabPanel>
              </TabPanels>
            </div>
          </TabGroup>
        </Card>
        
      </div>
    </div>
  );
}
