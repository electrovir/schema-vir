// cspell:words apoapsis periapsis

/**
 * A large, deeply-nested JSON Schema used to stress test type instantiation in `mapSchemaToShape`.
 * It is intentionally on par with the largest schemas seen in real applications: a single top-level
 * wrapper object with many richly-typed sections, reusable `$defs` and legacy `definitions` blocks,
 * arrays of nested objects, JSON Pointer `$ref`s reused from multiple sites, enums, multi-type
 * (nullable) fields, and several levels of nesting.
 *
 * The point of the accompanying test is not to assert every leaf type but to confirm that the
 * recursive mapped-type machinery (and the `$ref` / `definitions` handling in particular) resolves
 * the whole document without blowing up the TypeScript server.
 */
export const hugeSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'spacecraft_mission_telemetry_report',
    title: 'Spacecraft Mission Telemetry Report',
    description: 'A synthetic, large schema for type-instantiation stress testing.',
    type: 'object',
    required: [
        'report',
    ],
    additionalProperties: false,
    $defs: {
        measurement: {
            type: 'object',
            required: [
                'value',
                'unit',
            ],
            additionalProperties: false,
            properties: {
                value: {
                    type: 'number',
                },
                unit: {
                    type: 'string',
                    enum: [
                        'kelvin',
                        'pascal',
                        'meters_per_second',
                        'volts',
                        'amperes',
                        'kilograms',
                        'percent',
                    ],
                },
                recorded_at: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                tolerance: {
                    type: 'object',
                    required: [
                        'lower',
                        'upper',
                    ],
                    additionalProperties: false,
                    properties: {
                        lower: {
                            type: 'number',
                        },
                        upper: {
                            type: 'number',
                        },
                        nominal: {
                            type: [
                                'number',
                                'null',
                            ],
                        },
                    },
                },
                flags: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                quality: {
                    type: 'string',
                    enum: [
                        'good',
                        'degraded',
                        'stale',
                        'missing',
                    ],
                    default: 'good',
                },
            },
        },
        certification: {
            type: 'object',
            required: [
                'name',
                'level',
            ],
            additionalProperties: false,
            properties: {
                name: {
                    type: 'string',
                },
                level: {
                    type: 'string',
                    enum: [
                        'basic',
                        'advanced',
                        'instructor',
                    ],
                },
                issued_on: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date',
                },
                expires_on: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date',
                },
                authority: {
                    type: [
                        'string',
                        'null',
                    ],
                },
            },
        },
        crewMember: {
            type: 'object',
            required: [
                'id',
                'name',
                'role',
            ],
            additionalProperties: false,
            properties: {
                id: {
                    type: 'string',
                },
                name: {
                    type: 'string',
                },
                role: {
                    type: 'string',
                    enum: [
                        'commander',
                        'pilot',
                        'engineer',
                        'scientist',
                        'medic',
                    ],
                },
                certifications: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/certification',
                    },
                },
                vitals: {
                    type: 'object',
                    required: [
                        'heart_rate',
                    ],
                    additionalProperties: false,
                    properties: {
                        heart_rate: {
                            $ref: '#/$defs/measurement',
                        },
                        body_temperature: {
                            $ref: '#/$defs/measurement',
                        },
                        blood_oxygen: {
                            $ref: '#/$defs/measurement',
                        },
                        notes: {
                            type: [
                                'string',
                                'null',
                            ],
                        },
                    },
                },
                duty_log: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: [
                            'shift',
                        ],
                        additionalProperties: false,
                        properties: {
                            shift: {
                                type: 'string',
                                enum: [
                                    'alpha',
                                    'beta',
                                    'gamma',
                                ],
                            },
                            started_at: {
                                type: [
                                    'string',
                                    'null',
                                ],
                                format: 'date-time',
                            },
                            ended_at: {
                                type: [
                                    'string',
                                    'null',
                                ],
                                format: 'date-time',
                            },
                            tasks_completed: {
                                type: [
                                    'integer',
                                    'null',
                                ],
                                minimum: 0,
                            },
                        },
                    },
                },
            },
        },
        anomaly: {
            type: 'object',
            required: [
                'code',
                'severity',
            ],
            additionalProperties: false,
            properties: {
                code: {
                    type: 'string',
                },
                severity: {
                    type: 'string',
                    enum: [
                        'info',
                        'caution',
                        'warning',
                        'critical',
                    ],
                },
                detected_at: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                subsystem: {
                    type: [
                        'string',
                        'null',
                    ],
                },
                description: {
                    type: [
                        'string',
                        'null',
                    ],
                },
                affected_measurements: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/measurement',
                    },
                },
                resolution: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        status: {
                            type: 'string',
                            enum: [
                                'open',
                                'mitigated',
                                'resolved',
                            ],
                            default: 'open',
                        },
                        resolved_at: {
                            type: [
                                'string',
                                'null',
                            ],
                            format: 'date-time',
                        },
                        steps: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
        },
        maneuver: {
            type: 'object',
            required: [
                'kind',
            ],
            additionalProperties: false,
            properties: {
                kind: {
                    type: 'string',
                    enum: [
                        'burn',
                        'rotation',
                        'docking',
                        'separation',
                    ],
                },
                scheduled_for: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                delta_v: {
                    $ref: '#/$defs/measurement',
                },
                duration_seconds: {
                    type: [
                        'number',
                        'null',
                    ],
                    minimum: 0,
                },
                target: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        name: {
                            type: [
                                'string',
                                'null',
                            ],
                        },
                        orbit: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                apoapsis_km: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                },
                                periapsis_km: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                },
                                inclination_deg: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    definitions: {
        subsystemStatus: {
            type: 'object',
            required: [
                'name',
                'state',
            ],
            additionalProperties: false,
            properties: {
                name: {
                    type: 'string',
                },
                state: {
                    type: 'string',
                    enum: [
                        'nominal',
                        'standby',
                        'degraded',
                        'offline',
                    ],
                },
                redundancy: {
                    type: [
                        'integer',
                        'null',
                    ],
                    minimum: 0,
                },
                last_check: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                metrics: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/measurement',
                    },
                },
            },
        },
        groundContact: {
            type: 'object',
            required: [
                'station',
            ],
            additionalProperties: false,
            properties: {
                station: {
                    type: 'string',
                },
                band: {
                    type: 'string',
                    enum: [
                        'S',
                        'X',
                        'Ka',
                    ],
                },
                acquired_at: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                lost_at: {
                    type: [
                        'string',
                        'null',
                    ],
                    format: 'date-time',
                },
                signal_strength: {
                    $ref: '#/$defs/measurement',
                },
            },
        },
    },
    properties: {
        report: {
            type: 'object',
            description: 'Complete mission telemetry report.',
            required: [
                'schema_version',
                'mission',
                'spacecraft',
                'generated_at',
            ],
            additionalProperties: false,
            properties: {
                schema_version: {
                    type: 'string',
                    const: 'v1',
                },
                generated_at: {
                    type: 'string',
                    format: 'date-time',
                },
                mission: {
                    type: 'object',
                    required: [
                        'id',
                        'name',
                        'phase',
                    ],
                    additionalProperties: false,
                    properties: {
                        id: {
                            type: 'string',
                        },
                        name: {
                            type: 'string',
                        },
                        phase: {
                            type: 'string',
                            enum: [
                                'pre_launch',
                                'ascent',
                                'orbit',
                                'transit',
                                'descent',
                                'recovery',
                            ],
                        },
                        elapsed_seconds: {
                            type: [
                                'number',
                                'null',
                            ],
                            minimum: 0,
                        },
                        objectives: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: [
                                    'title',
                                ],
                                additionalProperties: false,
                                properties: {
                                    title: {
                                        type: 'string',
                                    },
                                    priority: {
                                        type: 'string',
                                        enum: [
                                            'primary',
                                            'secondary',
                                            'stretch',
                                        ],
                                        default: 'primary',
                                    },
                                    complete: {
                                        type: 'boolean',
                                        default: false,
                                    },
                                    progress_percent: {
                                        type: [
                                            'number',
                                            'null',
                                        ],
                                        minimum: 0,
                                        maximum: 100,
                                    },
                                },
                            },
                        },
                        flight_director: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: {
                                    type: [
                                        'string',
                                        'null',
                                    ],
                                },
                                console: {
                                    type: [
                                        'string',
                                        'null',
                                    ],
                                },
                            },
                        },
                    },
                },
                spacecraft: {
                    type: 'object',
                    required: [
                        'designation',
                        'propulsion',
                        'life_support',
                        'navigation',
                    ],
                    additionalProperties: false,
                    properties: {
                        designation: {
                            type: 'string',
                        },
                        mass_kg: {
                            $ref: '#/$defs/measurement',
                        },
                        propulsion: {
                            type: 'object',
                            required: [
                                'mode',
                            ],
                            additionalProperties: false,
                            properties: {
                                mode: {
                                    type: 'string',
                                    enum: [
                                        'chemical',
                                        'ion',
                                        'nuclear',
                                        'coast',
                                    ],
                                },
                                thrust: {
                                    $ref: '#/$defs/measurement',
                                },
                                fuel_remaining: {
                                    $ref: '#/$defs/measurement',
                                },
                                engines: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: [
                                            'index',
                                        ],
                                        additionalProperties: false,
                                        properties: {
                                            index: {
                                                type: 'integer',
                                                minimum: 0,
                                            },
                                            online: {
                                                type: 'boolean',
                                                default: true,
                                            },
                                            chamber_pressure: {
                                                $ref: '#/$defs/measurement',
                                            },
                                            nozzle_temperature: {
                                                $ref: '#/$defs/measurement',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        life_support: {
                            type: 'object',
                            required: [
                                'cabin_pressure',
                            ],
                            additionalProperties: false,
                            properties: {
                                cabin_pressure: {
                                    $ref: '#/$defs/measurement',
                                },
                                oxygen_level: {
                                    $ref: '#/$defs/measurement',
                                },
                                carbon_dioxide_level: {
                                    $ref: '#/$defs/measurement',
                                },
                                water_reserves: {
                                    $ref: '#/$defs/measurement',
                                },
                                scrubbers: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: [
                                            'id',
                                        ],
                                        additionalProperties: false,
                                        properties: {
                                            id: {
                                                type: 'string',
                                            },
                                            efficiency_percent: {
                                                type: [
                                                    'number',
                                                    'null',
                                                ],
                                                minimum: 0,
                                                maximum: 100,
                                            },
                                            online: {
                                                type: 'boolean',
                                                default: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        navigation: {
                            type: 'object',
                            required: [
                                'reference_frame',
                            ],
                            additionalProperties: false,
                            properties: {
                                reference_frame: {
                                    type: 'string',
                                    enum: [
                                        'inertial',
                                        'body',
                                        'orbital',
                                    ],
                                },
                                position: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        x_km: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                        y_km: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                        z_km: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                    },
                                },
                                velocity: {
                                    $ref: '#/$defs/measurement',
                                },
                                attitude: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        roll_deg: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                        pitch_deg: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                        yaw_deg: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                crew: {
                    type: 'array',
                    description: 'All crew aboard.',
                    default: [],
                    items: {
                        $ref: '#/$defs/crewMember',
                    },
                },
                telemetry_streams: {
                    type: 'array',
                    default: [],
                    items: {
                        type: 'object',
                        required: [
                            'channel',
                        ],
                        additionalProperties: false,
                        properties: {
                            channel: {
                                type: 'string',
                            },
                            sample_rate_hz: {
                                type: [
                                    'number',
                                    'null',
                                ],
                                minimum: 0,
                            },
                            samples: {
                                type: 'array',
                                items: {
                                    $ref: '#/$defs/measurement',
                                },
                            },
                            downlink: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    compressed: {
                                        type: 'boolean',
                                        default: false,
                                    },
                                    encryption: {
                                        type: 'string',
                                        enum: [
                                            'none',
                                            'aes',
                                            'quantum',
                                        ],
                                        default: 'none',
                                    },
                                    contact: {
                                        $ref: '#/definitions/groundContact',
                                    },
                                },
                            },
                        },
                    },
                },
                anomalies: {
                    type: 'array',
                    description: 'Active and historical anomalies.',
                    default: [],
                    items: {
                        $ref: '#/$defs/anomaly',
                    },
                },
                legacy_anomalies: {
                    type: 'array',
                    description:
                        'Deprecated mirror of anomalies, kept for old consumers. Reuses the anomalies item shape via a JSON Pointer.',
                    default: [],
                    items: {
                        $ref: '#/properties/report/properties/anomalies/items',
                    },
                },
                maneuvers: {
                    type: 'array',
                    default: [],
                    items: {
                        $ref: '#/$defs/maneuver',
                    },
                },
                subsystems: {
                    type: 'array',
                    default: [],
                    items: {
                        $ref: '#/definitions/subsystemStatus',
                    },
                },
                ground_contacts: {
                    type: 'array',
                    default: [],
                    items: {
                        $ref: '#/definitions/groundContact',
                    },
                },
                consumables: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        food_days_remaining: {
                            type: [
                                'number',
                                'null',
                            ],
                            minimum: 0,
                        },
                        power: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                battery_charge_percent: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                    minimum: 0,
                                    maximum: 100,
                                },
                                solar_array_output: {
                                    $ref: '#/$defs/measurement',
                                },
                                reserve: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        available: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                        committed: {
                                            type: [
                                                'number',
                                                'null',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                        propellant: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                oxidizer_kg: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                },
                                fuel_kg: {
                                    type: [
                                        'number',
                                        'null',
                                    ],
                                },
                            },
                        },
                    },
                },
                communications: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        uplink_active: {
                            type: 'boolean',
                            default: false,
                        },
                        latency_seconds: {
                            type: [
                                'number',
                                'null',
                            ],
                            minimum: 0,
                        },
                        packets: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                sent: {
                                    type: [
                                        'integer',
                                        'null',
                                    ],
                                    minimum: 0,
                                },
                                received: {
                                    type: [
                                        'integer',
                                        'null',
                                    ],
                                    minimum: 0,
                                },
                                dropped: {
                                    type: [
                                        'integer',
                                        'null',
                                    ],
                                    minimum: 0,
                                },
                            },
                        },
                    },
                },
                execution: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        generated_by: {
                            type: [
                                'string',
                                'null',
                            ],
                        },
                        duration_ms: {
                            type: [
                                'number',
                                'null',
                            ],
                            minimum: 0,
                        },
                        retry_attempts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: [
                                    'attempt_number',
                                ],
                                additionalProperties: false,
                                properties: {
                                    attempt_number: {
                                        type: 'integer',
                                        minimum: 0,
                                    },
                                    strategy: {
                                        type: [
                                            'string',
                                            'null',
                                        ],
                                    },
                                    error_codes: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                        },
                                    },
                                    note: {
                                        type: [
                                            'string',
                                            'null',
                                        ],
                                    },
                                },
                            },
                        },
                        warnings: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                    },
                },
                notes: {
                    type: [
                        'string',
                        'null',
                    ],
                },
            },
        },
    },
} as const;
