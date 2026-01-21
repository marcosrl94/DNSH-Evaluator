/**
 * Extended Measures Catalog
 * 
 * Comprehensive catalog of adaptation measures with full metadata,
 * knowledge base integration, and scalability for future expansion
 */

import { ExtendedMeasure } from '../types/catalog';
import { EPAdaptationMeasureCategory, EPAdaptationPathwayType } from '../constants/equatorPrinciples';

/**
 * Expanded catalog of adaptation measures
 * Organized by category and pathway type
 */
export const EXTENDED_MEASURES: ExtendedMeasure[] = [
  // ========== STRUCTURAL MEASURES ==========
  
  // Flood Protection
  {
    id: 'm1',
    name: 'Flood Barriers (0.5m)',
    description: 'Install perimeter flood protection walls with 0.5m height to protect against moderate flooding events.',
    cost: 500000,
    reductionFactor: 0.8,
    mitigatesHazards: ['h21', 'h15', 'h16'],
    riskReductionPercentage: 20,
    category: EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 4,
      total: 6
    },
    maintenanceRequired: true,
    maintenanceCost: 10000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['Building', 'Warehouse', 'Data Center', 'Port', 'Infrastructure'],
    applicableRegions: ['Coastal', 'Riverine', 'Floodplain'],
    applicableHazards: ['h21', 'h15', 'h16'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Physical barrier prevents floodwater from reaching asset infrastructure, reducing direct exposure to flood events',
        effectiveness: {
          vulnerabilityReduction: 70,
          exposureReduction: 80,
          overallRiskReduction: 75
        },
        applicabilityConditions: [
          'Effective for flood depths up to 0.5m',
          'Requires proper foundation and anchoring',
          'Must account for local flood patterns'
        ],
        evidence: [
          {
            source: 'FEMA Technical Bulletin 1-08',
            effectiveness: 75,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Reduces exposure to riverine flooding by creating physical barrier',
        effectiveness: {
          vulnerabilityReduction: 65,
          exposureReduction: 75,
          overallRiskReduction: 70
        }
      },
      {
        hazardId: 'h16',
        hazardCode: 'WAT-04',
        mitigationMechanism: 'Protects against coastal flooding and storm surge by blocking water ingress',
        effectiveness: {
          vulnerabilityReduction: 60,
          exposureReduction: 70,
          overallRiskReduction: 65
        },
        applicabilityConditions: [
          'Must be designed for saltwater exposure',
          'Requires regular maintenance in marine environments'
        ]
      }
    ],
    costBreakdown: {
      materials: 300000,
      labor: 150000,
      equipment: 30000,
      permits: 20000,
      contingency: 10
    },
    environmentalImpact: {
      co2Reduction: 0,
      biodiversityImpact: 'neutral',
      notes: 'Minimal environmental impact, may require vegetation management'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'water_quality',
        riskDescription: 'Prevents floodwater contamination of site',
        mitigationMechanism: 'Physical barrier prevents contaminated floodwater from entering asset area',
        effectiveness: 80,
        applicableStandards: ['EU WFD']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['flood', 'structural', 'coastal', 'riverine', 'standard']
  },
  
  {
    id: 'm2',
    name: 'Enhanced Drainage System',
    description: 'Upgrade storm water drainage capacity for 1-in-100yr events with improved collection, conveyance, and discharge systems.',
    cost: 250000,
    reductionFactor: 0.6,
    mitigatesHazards: ['h21', 'h20', 'h15'],
    riskReductionPercentage: 40,
    category: EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 3,
      execution: 6,
      total: 9
    },
    maintenanceRequired: true,
    maintenanceCost: 15000,
    maintenanceFrequency: 'quarterly',
    applicableAssetTypes: ['Building', 'Warehouse', 'Data Center', 'Infrastructure'],
    applicableRegions: ['All'],
    applicableHazards: ['h21', 'h20', 'h15'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Rapid removal of surface water reduces flood duration and depth, minimizing asset exposure',
        effectiveness: {
          vulnerabilityReduction: 50,
          exposureReduction: 60,
          overallRiskReduction: 55
        },
        applicabilityConditions: [
          'Requires adequate discharge capacity',
          'Must account for peak rainfall intensity'
        ]
      },
      {
        hazardId: 'h20',
        hazardCode: 'WAT-08',
        mitigationMechanism: 'Enhanced capacity handles heavy precipitation events, preventing surface water accumulation',
        effectiveness: {
          vulnerabilityReduction: 60,
          exposureReduction: 70,
          overallRiskReduction: 65
        },
        evidence: [
          {
            source: 'Urban Drainage Design Manual',
            effectiveness: 65,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Prevents riverine floodwater from accumulating on site',
        effectiveness: {
          vulnerabilityReduction: 45,
          exposureReduction: 55,
          overallRiskReduction: 50
        }
      }
    ],
    costBreakdown: {
      materials: 100000,
      labor: 100000,
      equipment: 30000,
      permits: 20000,
      contingency: 10
    },
    environmentalImpact: {
      co2Reduction: 0,
      biodiversityImpact: 'positive',
      notes: 'Can incorporate green infrastructure elements'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'water_quality',
        riskDescription: 'Prevents stormwater runoff contamination',
        mitigationMechanism: 'Proper drainage reduces standing water and associated contamination risks',
        effectiveness: 70,
        applicableStandards: ['EU WFD', 'ISO 14001']
      },
      {
        riskType: 'ecosystem_degradation',
        riskDescription: 'Reduces impact on local ecosystems',
        mitigationMechanism: 'Green infrastructure elements can enhance local biodiversity',
        effectiveness: 40,
        applicableStandards: ['EU Biodiversity Strategy']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['drainage', 'structural', 'stormwater', 'standard']
  },

  {
    id: 'm7',
    name: 'Raised Foundation/Platform',
    description: 'Elevate building foundations or create raised platforms above projected flood levels (typically 0.5-1.5m above ground).',
    cost: 800000,
    reductionFactor: 0.7,
    mitigatesHazards: ['h21', 'h15', 'h16'],
    riskReductionPercentage: 30,
    category: EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 4,
      execution: 8,
      total: 12
    },
    maintenanceRequired: false,
    applicableAssetTypes: ['Building', 'Warehouse', 'Data Center'],
    applicableRegions: ['Coastal', 'Riverine', 'Floodplain'],
    applicableHazards: ['h21', 'h15', 'h16'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-09',
        mitigationMechanism: 'Elevated foundation places critical infrastructure above flood levels, eliminating direct exposure',
        effectiveness: {
          vulnerabilityReduction: 85,
          exposureReduction: 90,
          overallRiskReduction: 87
        },
        applicabilityConditions: [
          'Must be elevated above projected flood levels',
          'Requires structural engineering assessment',
          'Most effective for new construction'
        ]
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Elevation protects against riverine flooding',
        effectiveness: {
          vulnerabilityReduction: 80,
          exposureReduction: 85,
          overallRiskReduction: 82
        }
      },
      {
        hazardId: 'h16',
        hazardCode: 'WAT-04',
        mitigationMechanism: 'Elevated platform prevents coastal flooding from reaching infrastructure',
        effectiveness: {
          vulnerabilityReduction: 75,
          exposureReduction: 80,
          overallRiskReduction: 77
        }
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['flood', 'structural', 'elevation', 'foundation']
  },

  {
    id: 'm8',
    name: 'Seawall Reinforcement',
    description: 'Strengthen and raise existing seawalls or construct new coastal protection structures to withstand higher sea levels and storm surges.',
    cost: 3000000,
    reductionFactor: 0.75,
    mitigatesHazards: ['h17', 'h16', 'h23'],
    riskReductionPercentage: 25,
    category: EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 6,
      execution: 12,
      total: 18
    },
    maintenanceRequired: true,
    maintenanceCost: 50000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['Port', 'Coastal Infrastructure', 'Building'],
    applicableRegions: ['Coastal'],
    applicableHazards: ['h17', 'h16', 'h23'],
    hazardMitigation: [
      {
        hazardId: 'h17',
        hazardCode: 'WAT-05',
        mitigationMechanism: 'Physical barrier prevents sea level rise from reaching asset, protecting against gradual inundation',
        effectiveness: {
          vulnerabilityReduction: 85,
          exposureReduction: 90,
          overallRiskReduction: 87
        },
        applicabilityConditions: [
          'Must be designed for projected sea level rise (2050, 2100)',
          'Requires regular maintenance and monitoring',
          'Effectiveness depends on elevation relative to sea level'
        ],
        evidence: [
          {
            source: 'IPCC AR6 Sea Level Rise Adaptation Guidelines',
            effectiveness: 85,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h16',
        hazardCode: 'WAT-04',
        mitigationMechanism: 'Reinforced seawall blocks coastal flooding and storm surge from reaching infrastructure',
        effectiveness: {
          vulnerabilityReduction: 80,
          exposureReduction: 85,
          overallRiskReduction: 82
        }
      },
      {
        hazardId: 'h23',
        hazardCode: 'SOL-03',
        mitigationMechanism: 'Stabilizes coastal foundations and prevents erosion-related subsidence',
        effectiveness: {
          vulnerabilityReduction: 75,
          overallRiskReduction: 75
        }
      }
    ],
    environmentalRiskMitigation: [
      {
        riskType: 'ecosystem_degradation',
        riskDescription: 'Can impact coastal ecosystems if not designed properly',
        mitigationMechanism: 'Design can incorporate ecological considerations',
        effectiveness: 30,
        applicableStandards: ['EU Marine Strategy Framework Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['coastal', 'structural', 'sea-level-rise', 'storm-surge']
  },

  // ========== NATURE-BASED MEASURES ==========

  {
    id: 'm9',
    name: 'Green Infrastructure for Stormwater',
    description: 'Implement green roofs, permeable pavements, rain gardens, and bioswales to manage stormwater naturally.',
    cost: 400000,
    reductionFactor: 0.65,
    mitigatesHazards: ['h21', 'h20', 'h15'],
    riskReductionPercentage: 35,
    category: EPAdaptationMeasureCategory.NATURE_BASED,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 4,
      total: 6
    },
    maintenanceRequired: true,
    maintenanceCost: 20000,
    maintenanceFrequency: 'quarterly',
    applicableAssetTypes: ['Building', 'Warehouse', 'Infrastructure'],
    applicableRegions: ['Urban', 'Suburban'],
    applicableHazards: ['h21', 'h20', 'h15'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Green infrastructure absorbs and retains stormwater, reducing flood volume and peak flow',
        effectiveness: {
          vulnerabilityReduction: 55,
          exposureReduction: 50,
          overallRiskReduction: 52
        },
        applicabilityConditions: [
          'Requires adequate soil depth and permeability',
          'Most effective in urban areas with impervious surfaces'
        ]
      },
      {
        hazardId: 'h20',
        hazardCode: 'WAT-08',
        mitigationMechanism: 'Permeable surfaces and vegetation reduce surface runoff from heavy precipitation',
        effectiveness: {
          vulnerabilityReduction: 60,
          exposureReduction: 55,
          overallRiskReduction: 57
        }
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Natural drainage systems manage riverine floodwater more effectively',
        effectiveness: {
          vulnerabilityReduction: 50,
          exposureReduction: 45,
          overallRiskReduction: 47
        }
      }
    ],
    environmentalImpact: {
      co2Reduction: 50,
      biodiversityImpact: 'positive',
      notes: 'Enhances biodiversity, improves air quality, reduces urban heat island effect'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'biodiversity_loss',
        riskDescription: 'Enhances local biodiversity',
        mitigationMechanism: 'Green infrastructure provides habitat and enhances ecosystem services',
        effectiveness: 70,
        applicableStandards: ['EU Biodiversity Strategy', 'EU Green Infrastructure Strategy']
      },
      {
        riskType: 'air_quality',
        riskDescription: 'Improves air quality through vegetation',
        mitigationMechanism: 'Plants filter pollutants and produce oxygen',
        effectiveness: 60,
        applicableStandards: ['EU Air Quality Directive']
      },
      {
        riskType: 'water_quality',
        riskDescription: 'Improves water quality through natural filtration',
        mitigationMechanism: 'Vegetation and soil filter pollutants from stormwater',
        effectiveness: 65,
        applicableStandards: ['EU WFD']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['nature-based', 'green-infrastructure', 'stormwater', 'biodiversity']
  },

  {
    id: 'm10',
    name: 'Coastal Wetland Restoration',
    description: 'Restore or create coastal wetlands and mangroves to provide natural flood protection and erosion control.',
    cost: 600000,
    reductionFactor: 0.85,
    mitigatesHazards: ['h17', 'h16', 'h23'],
    riskReductionPercentage: 15,
    category: EPAdaptationMeasureCategory.NATURE_BASED,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 6,
      execution: 24,
      total: 30
    },
    maintenanceRequired: true,
    maintenanceCost: 30000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['Coastal Infrastructure', 'Port'],
    applicableRegions: ['Coastal'],
    applicableHazards: ['h17', 'h16', 'h23'],
    hazardMitigation: [
      {
        hazardId: 'h17',
        hazardCode: 'WAT-05',
        mitigationMechanism: 'Wetlands act as natural buffer, absorbing and slowing sea level rise impacts while providing ecosystem services',
        effectiveness: {
          vulnerabilityReduction: 60,
          exposureReduction: 50,
          overallRiskReduction: 55
        },
        applicabilityConditions: [
          'Requires suitable coastal location',
          'Takes 3-5 years to establish',
          'Most effective when combined with other measures'
        ],
        evidence: [
          {
            source: 'Ramsar Convention on Wetlands',
            effectiveness: 55,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h16',
        hazardCode: 'WAT-04',
        mitigationMechanism: 'Wetlands filter and buffer saline intrusion',
        effectiveness: {
          vulnerabilityReduction: 50,
          overallRiskReduction: 50
        }
      },
      {
        hazardId: 'h23',
        hazardCode: 'SOL-01',
        mitigationMechanism: 'Root systems stabilize coastal soils and reduce erosion',
        effectiveness: {
          vulnerabilityReduction: 65,
          overallRiskReduction: 65
        }
      }
    ],
    environmentalImpact: {
      co2Reduction: 200,
      biodiversityImpact: 'positive',
      notes: 'Significant biodiversity benefits, carbon sequestration, habitat creation'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'biodiversity_loss',
        riskDescription: 'Enhances coastal biodiversity',
        mitigationMechanism: 'Wetlands provide critical habitat for coastal species',
        effectiveness: 90,
        applicableStandards: ['EU Biodiversity Strategy', 'Ramsar Convention']
      },
      {
        riskType: 'ecosystem_degradation',
        riskDescription: 'Restores degraded coastal ecosystems',
        mitigationMechanism: 'Wetland restoration improves ecosystem health and resilience',
        effectiveness: 85,
        applicableStandards: ['EU Marine Strategy Framework Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['nature-based', 'wetland', 'coastal', 'biodiversity', 'carbon-sequestration']
  },

  {
    id: 'm11',
    name: 'Urban Forest and Tree Canopy',
    description: 'Plant and maintain urban forests and tree canopies to reduce heat island effect and provide shade.',
    cost: 150000,
    reductionFactor: 0.9,
    mitigatesHazards: ['h2', 'h5', 'h1'],
    riskReductionPercentage: 10,
    category: EPAdaptationMeasureCategory.NATURE_BASED,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 1,
      execution: 3,
      total: 4
    },
    maintenanceRequired: true,
    maintenanceCost: 15000,
    maintenanceFrequency: 'quarterly',
    applicableAssetTypes: ['Building', 'Warehouse', 'Infrastructure'],
    applicableRegions: ['Urban', 'Suburban'],
    applicableHazards: ['h2', 'h5', 'h1'],
    hazardMitigation: [
      {
        hazardId: 'h2',
        hazardCode: 'TEMP-02',
        mitigationMechanism: 'Tree canopy provides shade and evapotranspiration, reducing ambient temperature and heat stress',
        effectiveness: {
          vulnerabilityReduction: 40,
          intensityReduction: 15, // Actually reduces local heat intensity
          overallRiskReduction: 45
        },
        applicabilityConditions: [
          'Requires adequate space and soil',
          'Takes 5-10 years to reach full effectiveness',
          'Most effective in urban areas'
        ]
      },
      {
        hazardId: 'h5',
        hazardCode: 'TEMP-05',
        mitigationMechanism: 'Shade and cooling effect reduce impact of heat waves',
        effectiveness: {
          vulnerabilityReduction: 35,
          intensityReduction: 10,
          overallRiskReduction: 40
        }
      },
      {
        hazardId: 'h1',
        hazardCode: 'TEMP-01',
        mitigationMechanism: 'Urban forests moderate temperature increases through shading and evapotranspiration',
        effectiveness: {
          vulnerabilityReduction: 30,
          intensityReduction: 8,
          overallRiskReduction: 35
        }
      }
    ],
    environmentalImpact: {
      co2Reduction: 100,
      biodiversityImpact: 'positive',
      notes: 'Improves air quality, reduces cooling needs, enhances biodiversity'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'biodiversity_loss',
        riskDescription: 'Enhances urban biodiversity',
        mitigationMechanism: 'Trees provide habitat for urban wildlife',
        effectiveness: 70,
        applicableStandards: ['EU Biodiversity Strategy']
      },
      {
        riskType: 'air_quality',
        riskDescription: 'Improves air quality',
        mitigationMechanism: 'Trees filter pollutants and produce oxygen',
        effectiveness: 75,
        applicableStandards: ['EU Air Quality Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['nature-based', 'urban-forest', 'heat-island', 'biodiversity']
  },

  // ========== TECHNOLOGICAL MEASURES ==========

  {
    id: 'm3',
    name: 'Heat-Resistant Materials',
    description: 'Use PV panels, roofing materials, and building components rated for higher operating temperatures (up to 85°C).',
    cost: 1000000,
    reductionFactor: 0.4,
    mitigatesHazards: ['h2', 'h5', 'h1'],
    riskReductionPercentage: 60,
    category: EPAdaptationMeasureCategory.TECHNOLOGICAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 3,
      total: 5
    },
    maintenanceRequired: false,
    applicableAssetTypes: ['Solar PV Plant', 'Building', 'Warehouse'],
    applicableRegions: ['All'],
    applicableHazards: ['h2', 'h5', 'h1'],
    hazardMitigation: [
      {
        hazardId: 'h2',
        hazardCode: 'TEMP-02',
        mitigationMechanism: 'Materials with higher temperature tolerance reduce performance degradation and failure risk during heat stress events',
        effectiveness: {
          vulnerabilityReduction: 80,
          intensityReduction: 0, // Doesn't reduce hazard intensity, only vulnerability
          overallRiskReduction: 80
        },
        applicabilityConditions: [
          'Requires materials rated for operating temperatures above 85°C',
          'Most effective for solar PV installations'
        ],
        evidence: [
          {
            source: 'IEC 61215 Standard Testing',
            effectiveness: 80,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h5',
        hazardCode: 'TEMP-05',
        mitigationMechanism: 'Heat-resistant materials maintain structural integrity and performance during heat wave events',
        effectiveness: {
          vulnerabilityReduction: 75,
          overallRiskReduction: 75
        }
      },
      {
        hazardId: 'h1',
        hazardCode: 'TEMP-01',
        mitigationMechanism: 'Materials designed for higher baseline temperatures reduce sensitivity to changing temperature patterns',
        effectiveness: {
          vulnerabilityReduction: 70,
          overallRiskReduction: 70
        }
      }
    ],
    technicalSpecs: {
      standards: ['IEC 61215', 'IEC 61730'],
      materials: ['High-temperature PV modules', 'Reflective roofing']
    },
    environmentalRiskMitigation: [
      {
        riskType: 'resource_depletion',
        riskDescription: 'Reduces need for replacement due to heat damage',
        mitigationMechanism: 'Longer-lasting materials reduce resource consumption',
        effectiveness: 30,
        applicableStandards: ['ISO 14001']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['technological', 'materials', 'heat', 'pv', 'standard']
  },

  {
    id: 'm5',
    name: 'HVAC Upgrade',
    description: 'Install high-efficiency cooling systems with increased capacity for extreme heat events, including backup systems.',
    cost: 750000,
    reductionFactor: 0.7,
    mitigatesHazards: ['h2', 'h5', 'h1'],
    riskReductionPercentage: 30,
    category: EPAdaptationMeasureCategory.TECHNOLOGICAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 4,
      total: 6
    },
    maintenanceRequired: true,
    maintenanceCost: 25000,
    maintenanceFrequency: 'quarterly',
    applicableAssetTypes: ['Building', 'Data Center', 'Warehouse'],
    applicableRegions: ['All'],
    applicableHazards: ['h2', 'h5', 'h1'],
    hazardMitigation: [
      {
        hazardId: 'h2',
        hazardCode: 'TEMP-02',
        mitigationMechanism: 'Enhanced cooling capacity maintains safe operating temperatures during heat stress, protecting equipment and occupants',
        effectiveness: {
          vulnerabilityReduction: 70,
          overallRiskReduction: 70
        },
        applicabilityConditions: [
          'Requires adequate power supply',
          'Most effective for climate-controlled facilities',
          'Backup systems recommended for critical infrastructure'
        ],
        evidence: [
          {
            source: 'ASHRAE Standard 90.1',
            effectiveness: 70,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h5',
        hazardCode: 'TEMP-05',
        mitigationMechanism: 'Increased cooling capacity handles extreme heat wave conditions',
        effectiveness: {
          vulnerabilityReduction: 65,
          overallRiskReduction: 65
        }
      },
      {
        hazardId: 'h1',
        hazardCode: 'TEMP-01',
        mitigationMechanism: 'Efficient systems adapt to changing baseline temperatures',
        effectiveness: {
          vulnerabilityReduction: 60,
          overallRiskReduction: 60
        }
      }
    ],
    technicalSpecs: {
      standards: ['ASHRAE 90.1', 'EN 16798'],
      certifications: ['Energy Star']
    },
    environmentalImpact: {
      co2Reduction: 30,
      notes: 'More efficient systems reduce energy consumption'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'air_quality',
        riskDescription: 'Reduces energy-related emissions',
        mitigationMechanism: 'More efficient systems reduce power consumption and associated emissions',
        effectiveness: 40,
        applicableStandards: ['EU Air Quality Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['technological', 'hvac', 'cooling', 'heat', 'standard']
  },

  {
    id: 'm12',
    name: 'Early Warning System',
    description: 'Install automated early warning systems for floods, storms, and extreme weather events with real-time monitoring.',
    cost: 200000,
    reductionFactor: 0.95,
    mitigatesHazards: ['h21', 'h15', 'h10', 'h11'],
    riskReductionPercentage: 5,
    category: EPAdaptationMeasureCategory.TECHNOLOGICAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 3,
      execution: 2,
      total: 5
    },
    maintenanceRequired: true,
    maintenanceCost: 20000,
    maintenanceFrequency: 'monthly',
    applicableAssetTypes: ['All'],
    applicableRegions: ['All'],
    applicableHazards: ['h21', 'h15', 'h10', 'h11'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-09',
        mitigationMechanism: 'Early warning provides advance notice of flood events, enabling preventive actions and evacuation',
        effectiveness: {
          vulnerabilityReduction: 30,
          exposureReduction: 40,
          overallRiskReduction: 35
        },
        applicabilityConditions: [
          'Requires reliable monitoring infrastructure',
          'Effectiveness depends on response time',
          'Must be integrated with emergency response plans'
        ],
        evidence: [
          {
            source: 'ISO 22327 Early Warning Systems',
            effectiveness: 35,
            confidence: 'high'
          }
        ]
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Early detection of riverine flooding enables preventive measures',
        effectiveness: {
          vulnerabilityReduction: 25,
          exposureReduction: 35,
          overallRiskReduction: 30
        }
      },
      {
        hazardId: 'h10',
        hazardCode: 'WIND-03',
        mitigationMechanism: 'Advance warning of cyclones enables asset protection and operational shutdown',
        effectiveness: {
          vulnerabilityReduction: 40,
          exposureReduction: 50,
          overallRiskReduction: 45
        }
      },
      {
        hazardId: 'h11',
        hazardCode: 'WIND-04',
        mitigationMechanism: 'Storm warnings enable preventive measures and reduce exposure',
        effectiveness: {
          vulnerabilityReduction: 35,
          exposureReduction: 45,
          overallRiskReduction: 40
        }
      }
    ],
    technicalSpecs: {
      standards: ['ISO 22327'],
      certifications: ['Weather Station Certification']
    },
    version: '1.0.0',
    status: 'approved',
    tags: ['technological', 'early-warning', 'monitoring', 'flood', 'storm']
  },

  {
    id: 'm13',
    name: 'Smart Water Management System',
    description: 'Implement IoT-based water monitoring and management system for efficient water use and leak detection.',
    cost: 150000,
    reductionFactor: 0.8,
    mitigatesHazards: ['h18', 'h19'],
    riskReductionPercentage: 20,
    category: EPAdaptationMeasureCategory.TECHNOLOGICAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 3,
      total: 5
    },
    maintenanceRequired: true,
    maintenanceCost: 10000,
    maintenanceFrequency: 'monthly',
    applicableAssetTypes: ['Building', 'Data Center', 'Industrial'],
    applicableRegions: ['All'],
    applicableHazards: ['h18', 'h19'],
    hazardMitigation: [
      {
        hazardId: 'h18',
        hazardCode: 'WAT-06',
        mitigationMechanism: 'Smart monitoring and management optimize water use, reducing vulnerability to water stress',
        effectiveness: {
          vulnerabilityReduction: 50,
          overallRiskReduction: 50
        },
        applicabilityConditions: [
          'Requires IoT infrastructure',
          'Most effective when combined with water conservation practices',
          'Requires regular data analysis'
        ],
        evidence: [
          {
            source: 'Smart Water Management Case Studies',
            effectiveness: 50,
            confidence: 'medium'
          }
        ]
      },
      {
        hazardId: 'h19',
        hazardCode: 'WAT-07',
        mitigationMechanism: 'Efficient water use and leak detection reduce vulnerability during drought periods',
        effectiveness: {
          vulnerabilityReduction: 45,
          overallRiskReduction: 45
        }
      }
    ],
    environmentalImpact: {
      waterSavings: 500,
      co2Reduction: 10,
      notes: 'Reduces water consumption and associated energy use'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'water_quality',
        riskDescription: 'Prevents water waste and contamination',
        mitigationMechanism: 'Early leak detection prevents water loss and potential contamination',
        effectiveness: 60,
        applicableStandards: ['EU WFD']
      },
      {
        riskType: 'resource_depletion',
        riskDescription: 'Reduces water resource consumption',
        mitigationMechanism: 'Optimized water use reduces demand on water resources',
        effectiveness: 55,
        applicableStandards: ['ISO 14001']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['technological', 'iot', 'water-management', 'drought', 'water-scarcity']
  },

  // ========== INSTITUTIONAL MEASURES ==========

  {
    id: 'm14',
    name: 'Climate Risk Management Policy',
    description: 'Develop and implement comprehensive climate risk management policies and procedures with regular review cycles.',
    cost: 50000,
    reductionFactor: 0.95,
    mitigatesHazards: ['h1', 'h2', 'h5', 'h7', 'h17', 'h21'],
    riskReductionPercentage: 5,
    category: EPAdaptationMeasureCategory.INSTITUTIONAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 6,
      execution: 3,
      total: 9
    },
    maintenanceRequired: true,
    maintenanceCost: 10000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['All'],
    applicableRegions: ['All'],
    applicableHazards: ['h1', 'h2', 'h5', 'h7', 'h17', 'h21'],
    hazardMitigation: [
      {
        hazardId: 'h1',
        hazardCode: 'TEMP-01',
        mitigationMechanism: 'Policy framework ensures systematic assessment and response to changing temperature patterns',
        effectiveness: {
          vulnerabilityReduction: 20,
          overallRiskReduction: 20
        },
        applicabilityConditions: [
          'Requires organizational commitment',
          'Effectiveness depends on implementation quality',
          'Must be regularly reviewed and updated'
        ]
      },
      {
        hazardId: 'h2',
        hazardCode: 'TEMP-02',
        mitigationMechanism: 'Policy establishes protocols for heat stress management',
        effectiveness: {
          vulnerabilityReduction: 25,
          overallRiskReduction: 25
        }
      },
      {
        hazardId: 'h5',
        hazardCode: 'TEMP-05',
        mitigationMechanism: 'Policy defines heat wave response procedures',
        effectiveness: {
          vulnerabilityReduction: 25,
          overallRiskReduction: 25
        }
      },
      {
        hazardId: 'h7',
        hazardCode: 'TEMP-07',
        mitigationMechanism: 'Policy establishes wildfire prevention and response protocols',
        effectiveness: {
          vulnerabilityReduction: 30,
          overallRiskReduction: 30
        }
      },
      {
        hazardId: 'h17',
        hazardCode: 'WAT-05',
        mitigationMechanism: 'Policy ensures sea level rise is considered in planning',
        effectiveness: {
          vulnerabilityReduction: 20,
          overallRiskReduction: 20
        }
      },
      {
        hazardId: 'h21',
        hazardCode: 'WAT-09',
        mitigationMechanism: 'Policy establishes flood risk management procedures',
        effectiveness: {
          vulnerabilityReduction: 25,
          overallRiskReduction: 25
        }
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['institutional', 'policy', 'governance', 'risk-management']
  },

  {
    id: 'm15',
    name: 'Emergency Response Plan',
    description: 'Create and regularly update emergency response plans for climate-related events with staff training.',
    cost: 30000,
    reductionFactor: 0.9,
    mitigatesHazards: ['h21', 'h15', 'h7', 'h10', 'h11'],
    riskReductionPercentage: 10,
    category: EPAdaptationMeasureCategory.INSTITUTIONAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 2,
      execution: 2,
      total: 4
    },
    maintenanceRequired: true,
    maintenanceCost: 5000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['All'],
    applicableRegions: ['All'],
    applicableHazards: ['h21', 'h15', 'h7', 'h10', 'h11'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-09',
        mitigationMechanism: 'Emergency plan enables rapid response to flood events, minimizing damage through timely actions',
        effectiveness: {
          vulnerabilityReduction: 40,
          exposureReduction: 30,
          overallRiskReduction: 35
        },
        applicabilityConditions: [
          'Requires regular training and drills',
          'Must be integrated with local emergency services',
          'Effectiveness depends on execution speed'
        ]
      },
      {
        hazardId: 'h15',
        hazardCode: 'WAT-03',
        mitigationMechanism: 'Plan enables rapid response to riverine flooding',
        effectiveness: {
          vulnerabilityReduction: 35,
          exposureReduction: 25,
          overallRiskReduction: 30
        }
      },
      {
        hazardId: 'h7',
        hazardCode: 'TEMP-07',
        mitigationMechanism: 'Emergency plan coordinates wildfire response and evacuation',
        effectiveness: {
          vulnerabilityReduction: 45,
          exposureReduction: 40,
          overallRiskReduction: 42
        }
      },
      {
        hazardId: 'h10',
        hazardCode: 'WIND-03',
        mitigationMechanism: 'Plan enables asset protection and safe shutdown before cyclone impact',
        effectiveness: {
          vulnerabilityReduction: 50,
          exposureReduction: 45,
          overallRiskReduction: 47
        }
      },
      {
        hazardId: 'h11',
        hazardCode: 'WIND-04',
        mitigationMechanism: 'Plan enables preventive measures before storm impact',
        effectiveness: {
          vulnerabilityReduction: 40,
          exposureReduction: 35,
          overallRiskReduction: 37
        }
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['institutional', 'emergency', 'response-plan', 'training']
  },

  // ========== BEHAVIORAL MEASURES ==========

  {
    id: 'm16',
    name: 'Operational Schedule Adjustment',
    description: 'Adjust operational schedules to avoid peak heat hours and extreme weather conditions.',
    cost: 0,
    reductionFactor: 0.95,
    mitigatesHazards: ['h2', 'h5', 'h1'],
    riskReductionPercentage: 5,
    category: EPAdaptationMeasureCategory.BEHAVIORAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 1,
      execution: 0,
      total: 1
    },
    maintenanceRequired: false,
    applicableAssetTypes: ['All'],
    applicableRegions: ['All'],
    applicableHazards: ['h2', 'h5', 'h1'],
    hazardMitigation: [
      {
        hazardId: 'h2',
        hazardCode: 'TEMP-02',
        mitigationMechanism: 'Avoiding peak heat hours reduces exposure to heat stress conditions',
        effectiveness: {
          vulnerabilityReduction: 30,
          exposureReduction: 40,
          overallRiskReduction: 35
        },
        applicabilityConditions: [
          'Requires operational flexibility',
          'Most effective for outdoor or non-climate-controlled operations',
          'May impact productivity'
        ]
      },
      {
        hazardId: 'h5',
        hazardCode: 'TEMP-05',
        mitigationMechanism: 'Scheduling avoids heat wave peak periods',
        effectiveness: {
          vulnerabilityReduction: 25,
          exposureReduction: 35,
          overallRiskReduction: 30
        }
      },
      {
        hazardId: 'h1',
        hazardCode: 'TEMP-01',
        mitigationMechanism: 'Adaptive scheduling responds to changing temperature patterns',
        effectiveness: {
          vulnerabilityReduction: 20,
          exposureReduction: 25,
          overallRiskReduction: 22
        }
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['behavioral', 'operational', 'schedule', 'heat']
  },

  {
    id: 'm17',
    name: 'Water Conservation Practices',
    description: 'Implement water conservation practices including recycling, reuse, and efficiency measures.',
    cost: 100000,
    reductionFactor: 0.85,
    mitigatesHazards: ['h18', 'h19'],
    riskReductionPercentage: 15,
    category: EPAdaptationMeasureCategory.BEHAVIORAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 1,
      execution: 2,
      total: 3
    },
    maintenanceRequired: true,
    maintenanceCost: 5000,
    maintenanceFrequency: 'quarterly',
    applicableAssetTypes: ['All'],
    applicableRegions: ['All'],
    applicableHazards: ['h18', 'h19'],
    hazardMitigation: [
      {
        hazardId: 'h18',
        hazardCode: 'WAT-06',
        mitigationMechanism: 'Water conservation practices reduce demand, decreasing vulnerability to water stress',
        effectiveness: {
          vulnerabilityReduction: 45,
          overallRiskReduction: 45
        },
        applicabilityConditions: [
          'Requires staff training and awareness',
          'Most effective when combined with technical measures',
          'Effectiveness depends on compliance'
        ]
      },
      {
        hazardId: 'h19',
        hazardCode: 'WAT-07',
        mitigationMechanism: 'Reduced water consumption increases resilience during drought periods',
        effectiveness: {
          vulnerabilityReduction: 40,
          overallRiskReduction: 40
        }
      }
    ],
    environmentalImpact: {
      waterSavings: 1000,
      co2Reduction: 5,
      notes: 'Reduces water demand and associated energy use'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'water_quality',
        riskDescription: 'Reduces water demand and wastewater generation',
        mitigationMechanism: 'Less water use means less wastewater and reduced contamination risk',
        effectiveness: 50,
        applicableStandards: ['EU WFD']
      },
      {
        riskType: 'resource_depletion',
        riskDescription: 'Reduces water resource consumption',
        mitigationMechanism: 'Conservation practices reduce demand on water resources',
        effectiveness: 60,
        applicableStandards: ['ISO 14001']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['behavioral', 'water-conservation', 'drought', 'water-scarcity']
  },

  // ========== EXISTING MEASURES (Enhanced) ==========

  {
    id: 'm4',
    name: 'Vegetation Management',
    description: 'Create fire breaks and manage surrounding vegetation to reduce wildfire risk through strategic clearing and maintenance.',
    cost: 50000,
    reductionFactor: 0.9,
    mitigatesHazards: ['h7'],
    riskReductionPercentage: 10,
    category: EPAdaptationMeasureCategory.NATURE_BASED,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 1,
      execution: 2,
      total: 3
    },
    maintenanceRequired: true,
    maintenanceCost: 10000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['Solar PV Plant', 'Wind Farm', 'Building'],
    applicableRegions: ['Forest', 'Grassland', 'Mediterranean'],
    applicableHazards: ['h7'],
    hazardMitigation: [
      {
        hazardId: 'h7',
        hazardCode: 'TEMP-07',
        mitigationMechanism: 'Fire breaks and managed vegetation reduce fuel load and create barriers that slow or stop wildfire spread',
        effectiveness: {
          vulnerabilityReduction: 60,
          exposureReduction: 50,
          overallRiskReduction: 55
        },
        applicabilityConditions: [
          'Requires regular maintenance (annually)',
          'Most effective when combined with other fire prevention measures',
          'Must comply with local fire regulations'
        ],
        evidence: [
          {
            source: 'USDA Forest Service Fire Management Guidelines',
            effectiveness: 55,
            confidence: 'high'
          }
        ]
      }
    ],
    environmentalImpact: {
      biodiversityImpact: 'neutral',
      notes: 'Can be designed to maintain biodiversity corridors'
    },
    environmentalRiskMitigation: [
      {
        riskType: 'biodiversity_loss',
        riskDescription: 'Proper vegetation management can enhance biodiversity',
        mitigationMechanism: 'Strategic clearing creates habitat diversity while reducing fire risk',
        effectiveness: 20,
        applicableStandards: ['EU Biodiversity Strategy']
      },
      {
        riskType: 'air_quality',
        riskDescription: 'Prevents wildfire smoke and particulate matter',
        mitigationMechanism: 'Reducing wildfire risk prevents air quality degradation from smoke',
        effectiveness: 60,
        applicableStandards: ['EU Air Quality Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['nature-based', 'vegetation', 'wildfire', 'standard']
  },

  {
    id: 'm6',
    name: 'Coastal Reinforcement',
    description: 'Reinforce sea walls and coastal foundations with enhanced materials and design for higher sea levels and storm surges.',
    cost: 2000000,
    reductionFactor: 0.85,
    mitigatesHazards: ['h21', 'h17', 'h23'],
    riskReductionPercentage: 15,
    category: EPAdaptationMeasureCategory.STRUCTURAL,
    pathwayType: EPAdaptationPathwayType.REDUCE,
    implementationTime: {
      planning: 6,
      execution: 12,
      total: 18
    },
    maintenanceRequired: true,
    maintenanceCost: 40000,
    maintenanceFrequency: 'annually',
    applicableAssetTypes: ['Port', 'Coastal Infrastructure', 'Building'],
    applicableRegions: ['Coastal'],
    applicableHazards: ['h21', 'h17', 'h23'],
    hazardMitigation: [
      {
        hazardId: 'h21',
        hazardCode: 'WAT-09',
        mitigationMechanism: 'Reinforced coastal structures prevent floodwater from reaching infrastructure',
        effectiveness: {
          vulnerabilityReduction: 80,
          exposureReduction: 85,
          overallRiskReduction: 82
        },
        applicabilityConditions: [
          'Requires engineering design for specific coastal conditions',
          'Must account for local wave patterns and storm surge',
          'Requires regular maintenance in marine environment'
        ]
      },
      {
        hazardId: 'h17',
        hazardCode: 'WAT-05',
        mitigationMechanism: 'Reinforced structures protect against gradual sea level rise',
        effectiveness: {
          vulnerabilityReduction: 75,
          exposureReduction: 80,
          overallRiskReduction: 77
        }
      },
      {
        hazardId: 'h23',
        hazardCode: 'SOL-01',
        mitigationMechanism: 'Reinforcement prevents coastal erosion from undermining foundations',
        effectiveness: {
          vulnerabilityReduction: 70,
          overallRiskReduction: 70
        }
      }
    ],
    environmentalRiskMitigation: [
      {
        riskType: 'ecosystem_degradation',
        riskDescription: 'Can impact coastal ecosystems if not designed properly',
        mitigationMechanism: 'Design can incorporate ecological considerations and habitat restoration',
        effectiveness: 30,
        applicableStandards: ['EU Marine Strategy Framework Directive']
      }
    ],
    version: '1.0.0',
    status: 'approved',
    tags: ['structural', 'coastal', 'sea-level-rise', 'standard']
  },
];

/**
 * Get measures by various filters
 */
export const getMeasuresByCategory = (category: EPAdaptationMeasureCategory): ExtendedMeasure[] => {
  return EXTENDED_MEASURES.filter(m => m.category === category);
};

export const getMeasuresByPathway = (pathway: EPAdaptationPathwayType): ExtendedMeasure[] => {
  return EXTENDED_MEASURES.filter(m => m.pathwayType === pathway);
};

export const getMeasuresByHazard = (hazardId: string): ExtendedMeasure[] => {
  return EXTENDED_MEASURES.filter(m => 
    m.applicableHazards.includes(hazardId) || m.mitigatesHazards.includes(hazardId)
  );
};

export const getAllMeasures = (): ExtendedMeasure[] => {
  return EXTENDED_MEASURES;
};
