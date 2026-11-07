import React from 'react';
import { Settings, Upload, CheckCircle2, Download } from 'lucide-react';

export default function Stepper({ currentStep, onStepClick }) {
  const steps = [
    { id: 1, label: 'Configurar Sedes', icon: Settings },
    { id: 2, label: 'Cargar Excel', icon: Upload },
    { id: 3, label: 'Revisar & Auditar', icon: CheckCircle2 },
    { id: 4, label: 'Exportar Reporte', icon: Download }
  ];

  return (
    <nav className="stepper-container" aria-label="Progreso del flujo de cálculo">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => onStepClick && onStepClick(step.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="stepper-step__badge">
                {isCompleted ? '✓' : <Icon size={14} />}
              </div>
              <span className="stepper-step__label">{step.label}</span>
            </button>
            {idx < steps.length - 1 && <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
