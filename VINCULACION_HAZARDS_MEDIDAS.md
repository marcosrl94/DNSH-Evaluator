# Sistema de Vinculación Hazards-Medidas

## Resumen

Se ha implementado un sistema completo de vinculación específica entre medidas de adaptación y hazards/riesgos ambientales concretos, reemplazando el sistema genérico anterior.

## Estructura de Vinculación

### 1. Hazard Mitigation (Vinculación Específica por Hazard)

Cada medida ahora incluye un array `hazardMitigation` con detalles específicos para cada hazard:

```typescript
hazardMitigation: [
  {
    hazardId: 'h2',
    hazardCode: 'TEMP-02',
    mitigationMechanism: 'Descripción específica de cómo mitiga este hazard',
    effectiveness: {
      vulnerabilityReduction: 80,      // % reducción vulnerabilidad
      exposureReduction: 70,            // % reducción exposición (opcional)
      intensityReduction: 0,            // % reducción intensidad (opcional)
      overallRiskReduction: 75          // % reducción riesgo total
    },
    applicabilityConditions: [
      'Condición 1',
      'Condición 2'
    ],
    evidence: [
      {
        source: 'Fuente de evidencia',
        effectiveness: 75,
        confidence: 'high' | 'medium' | 'low'
      }
    ]
  }
]
```

### 2. Environmental Risk Mitigation (Riesgos Ambientales)

Además de hazards climáticos, las medidas también mitigan riesgos ambientales específicos:

```typescript
environmentalRiskMitigation: [
  {
    riskType: 'water_quality' | 'air_quality' | 'biodiversity_loss' | etc.,
    riskDescription: 'Descripción del riesgo',
    mitigationMechanism: 'Cómo mitiga este riesgo',
    effectiveness: 60,  // 0-100%
    applicableStandards: ['EU WFD', 'ISO 14001']
  }
]
```

## Tipos de Riesgos Ambientales Soportados

- `water_quality` - Calidad del agua
- `air_quality` - Calidad del aire
- `soil_contamination` - Contaminación del suelo
- `biodiversity_loss` - Pérdida de biodiversidad
- `noise_pollution` - Contaminación acústica
- `waste_generation` - Generación de residuos
- `resource_depletion` - Agotamiento de recursos
- `ecosystem_degradation` - Degradación de ecosistemas

## Mejoras Implementadas

### 1. Visualización Mejorada en UI

- **Panel específico por hazard**: Muestra detalles de cómo la medida mitiga el hazard seleccionado
- **Efectividad desglosada**: Muestra reducción de vulnerabilidad, exposición e intensidad por separado
- **Condiciones de aplicabilidad**: Lista condiciones específicas para cada hazard
- **Evidencia**: Muestra fuentes de evidencia con nivel de confianza
- **Riesgos ambientales**: Muestra riesgos ambientales adicionales mitigados

### 2. Servicios Mejorados

- `getMeasuresByHazardSorted()`: Obtiene medidas ordenadas por efectividad específica para un hazard
- `getMeasureHazardMitigation()`: Obtiene detalles específicos de mitigación para un par medida-hazard
- `getEnvironmentalRisksMitigated()`: Obtiene riesgos ambientales mitigados por una medida
- `validateMeasureLinkage()`: Valida que todas las vinculaciones estén completas

### 3. Catálogo Actualizado

Todas las 17 medidas ahora incluyen:
- ✅ Vinculación específica con hazards (hazardMitigation)
- ✅ Efectividad detallada por hazard
- ✅ Mecanismos de mitigación específicos
- ✅ Condiciones de aplicabilidad
- ✅ Evidencia cuando está disponible
- ✅ Riesgos ambientales mitigados (cuando aplica)

## Ejemplo de Medida Completa

```typescript
{
  id: 'm1',
  name: 'Flood Barriers (0.5m)',
  // ... otros campos ...
  hazardMitigation: [
    {
      hazardId: 'h21',
      hazardCode: 'WAT-09',
      mitigationMechanism: 'Physical barrier prevents floodwater from reaching asset infrastructure',
      effectiveness: {
        vulnerabilityReduction: 70,
        exposureReduction: 80,
        overallRiskReduction: 75
      },
      applicabilityConditions: [
        'Effective for flood depths up to 0.5m',
        'Requires proper foundation and anchoring'
      ],
      evidence: [
        {
          source: 'FEMA Technical Bulletin 1-08',
          effectiveness: 75,
          confidence: 'high'
        }
      ]
    }
  ],
  environmentalRiskMitigation: [
    {
      riskType: 'water_quality',
      riskDescription: 'Prevents floodwater contamination of site',
      mitigationMechanism: 'Physical barrier prevents contaminated floodwater from entering',
      effectiveness: 80,
      applicableStandards: ['EU WFD']
    }
  ]
}
```

## Beneficios

1. **Precisión**: Efectividad específica por hazard en lugar de valores genéricos
2. **Transparencia**: Mecanismos de mitigación claramente documentados
3. **Evidencia**: Fuentes de evidencia vinculadas a cada mitigación
4. **Completitud**: Incluye riesgos ambientales además de hazards climáticos
5. **Escalabilidad**: Fácil añadir nuevas medidas y hazards
6. **Validación**: Sistema de validación asegura completitud

## Archivos Modificados

- `types/catalog.ts` - Tipos extendidos con hazardMitigation y environmentalRiskMitigation
- `constants/extendedMeasures.ts` - Todas las medidas actualizadas con vinculaciones específicas
- `services/catalogService.ts` - Funciones mejoradas para buscar por efectividad específica
- `services/measureHazardLinkage.ts` - Nuevo servicio para trabajar con vinculaciones
- `pages/DnshAdaptation.tsx` - UI mejorada mostrando detalles específicos

## Próximos Pasos

1. Añadir más evidencia a las medidas existentes
2. Expandir riesgos ambientales mitigados
3. Crear visualizaciones comparativas de efectividad
4. Integrar con base de conocimiento para casos de estudio
