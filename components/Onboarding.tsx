'use client';

import { useState, useEffect } from 'react';

export default function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('onboarding-seen');
    if (!hasSeen) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">Bienvenido a CierraPresupuesto</h2>
        <p className="mb-4">Genera presupuestos profesionales con IA en segundos.</p>
        <button
          onClick={() => {
            setShow(false);
            localStorage.setItem('onboarding-seen', 'true');
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Empezar
        </button>
      </div>
    </div>
  );
}