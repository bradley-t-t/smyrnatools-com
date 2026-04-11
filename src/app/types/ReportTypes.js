function createReportType({ name, title, frequency, assignment, review, fields }) {
    return {
        assignment: Array.isArray(assignment) ? assignment : [],
        fields: Array.isArray(fields)
            ? fields.map((f) => ({
                  ...f,
                  label: f.label || f.name,
                  required: !!f.required,
                  type: f.type || 'text'
              }))
            : [],
        frequency,
        name,
        review: Array.isArray(review) ? review : [],
        title
    }
}
const reportTypes = [
    createReportType({
        assignment: ['reports.assigned.district_manager'],
        fields: [
            { label: 'Monday Recap', name: 'monday', required: true, type: 'textarea' },
            { label: 'Tuesday Recap', name: 'tuesday', required: true, type: 'textarea' },
            { label: 'Wednesday Recap', name: 'wednesday', required: true, type: 'textarea' },
            { label: 'Thursday Recap', name: 'thursday', required: true, type: 'textarea' },
            { label: 'Friday Recap', name: 'friday', required: true, type: 'textarea' },
            { label: 'Saturday Recap', name: 'saturday', required: true, type: 'textarea' }
        ],
        frequency: 'weekly',
        name: 'district_manager',
        review: ['reports.review.district_manager'],
        title: 'District Manager Report'
    }),
    createReportType({
        assignment: ['reports.assigned.plant_manager'],
        fields: [
            { label: 'Yardage', name: 'yardage', required: true, type: 'number' },
            { label: 'Total Hours', name: 'total_hours', required: true, type: 'number' },
            { label: 'Operators Sent to Other Plants', name: 'operators_sent_to_help', required: false, type: 'table' }
        ],
        frequency: 'weekly',
        name: 'plant_manager',
        review: ['reports.review.plant_manager'],
        title: 'Plant Manager Report'
    }),
    createReportType({
        assignment: ['reports.assigned.plant_production'],
        fields: [
            {
                label: 'Production Rows',
                name: 'rows',
                required: false,
                type: 'table'
            }
        ],
        frequency: 'weekly',
        name: 'plant_production',
        review: ['reports.review.plant_production'],
        title: 'Weekly Plant Efficiency Report'
    }),
    createReportType({
        assignment: ['reports.assigned.aggregate_production'],
        fields: [
            { label: 'Sand', name: 'sand', required: true, type: 'number' },
            { label: 'Fill Dirt', name: 'fill_dirt', required: true, type: 'number' },
            { label: 'Black Dirt', name: 'black_dirt', required: true, type: 'number' },
            { label: 'Select Fill', name: 'select_fill', required: true, type: 'number' },
            { label: 'Freeport Crushed Concrete', name: 'crushed_concrete', required: true, type: 'number' },
            { label: 'Houston Crushed Concrete', name: 'houston_crushed_concrete', required: true, type: 'number' },
            { label: '3 x 5 Crushed', name: 'three_by_five_crushed', required: true, type: 'number' },
            { label: 'Stabilized Sand', name: 'stabilized_sand', required: true, type: 'number' },
            {
                label: 'Stabilized Crushed Concrete',
                name: 'stabilized_crushed_concrete',
                required: true,
                type: 'number'
            },
            { label: 'Beach Quality Sand', name: 'beach_quality_sand', required: true, type: 'number' },
            { label: 'Limestone - 1"', name: 'limestone_one_inch', required: true, type: 'number' },
            { label: 'White Screened Sand', name: 'white_screened_sand', required: true, type: 'number' },
            { label: 'Unscreened White Sand', name: 'unscreened_white_sand', required: true, type: 'number' },
            { label: '3/8" Pea Gravel', name: 'pea_gravel_three_eighths', required: true, type: 'number' },
            { label: 'Crushed Asphalt', name: 'crushed_asphalt', required: true, type: 'number' },
            { label: 'Screened Sand', name: 'screened_sand', required: true, type: 'number' },
            { label: 'Washout', name: 'washout', required: true, type: 'number' },
            { label: 'Rip Rap', name: 'rip_rap', required: true, type: 'number' }
        ],
        frequency: 'weekly',
        name: 'aggregate_production',
        review: ['reports.review.aggregate_production'],
        title: 'Aggregate Production'
    }),
    createReportType({
        assignment: ['reports.assigned.safety_manager'],
        fields: [{ label: 'Issues', name: 'issues', required: false, type: 'table' }],
        frequency: 'weekly',
        name: 'safety_manager',
        review: ['reports.review.safety_manager'],
        title: 'Safety Manager Report'
    }),
    createReportType({
        assignment: ['reports.assigned.safety_environmental_rep'],
        fields: [{ label: 'Issues', name: 'issues', required: false, type: 'table' }],
        frequency: 'weekly',
        name: 'safety_environmental_rep',
        review: ['reports.review.safety_environmental_rep'],
        title: 'Safety / Environmental Representative'
    }),
    createReportType({
        assignment: ['reports.assigned.general_manager'],
        fields: [],
        frequency: 'weekly',
        name: 'general_manager',
        review: ['reports.review.general_manager'],
        title: 'General Manager Report'
    }),
    createReportType({
        assignment: ['reports.assigned.rmi'],
        fields: [],
        frequency: 'weekly',
        name: 'ready_mix_instructor',
        review: ['reports.review.rmi'],
        title: 'Ready Mix Instructor'
    }),
    createReportType({
        assignment: ['reports.assigned.quality_control_manager'],
        fields: [
            { label: 'Monday Recap', name: 'monday', required: true, type: 'textarea' },
            { label: 'Tuesday Recap', name: 'tuesday', required: true, type: 'textarea' },
            { label: 'Wednesday Recap', name: 'wednesday', required: true, type: 'textarea' },
            { label: 'Thursday Recap', name: 'thursday', required: true, type: 'textarea' },
            { label: 'Friday Recap', name: 'friday', required: true, type: 'textarea' },
            { label: 'Saturday Recap', name: 'saturday', required: true, type: 'textarea' }
        ],
        frequency: 'weekly',
        name: 'quality_control_manager',
        review: ['reports.review.quality_control_manager'],
        title: 'Quality Control Manager Report'
    }),
    createReportType({
        assignment: ['reports.assigned.test'],
        fields: [{ label: 'test', name: 'test', required: true, type: 'text' }],
        frequency: 'weekly',
        name: 'test',
        review: ['reports.review.test'],
        title: 'Test'
    })
]
/** One-off report types (not weekly recurring). */
const oneOffReportTypes = [
    {
        name: 'lost_load',
        title: 'Lost Load Report',
        icon: 'fa-truck',
        iconBg: 'bg-red-500',
        description: 'Report lost or spilled loads with details',
        permission: 'reports.lostloads',
        reviewPermission: 'reports.review.lost_load'
    },
    {
        name: 'qc_strength',
        title: 'Quality Control Strength Report',
        icon: 'fa-flask',
        iconBg: 'bg-violet-600',
        description: 'Concrete cylinder strength testing and sample data',
        permission: 'reports.qc_strength',
        reviewPermission: 'reports.review.qc_strength',
        fields: [
            // Identification
            { label: 'Order No.', name: 'order_no', required: false, type: 'text' },
            { label: 'Mix ID', name: 'mix_id', required: false, type: 'text' },
            { label: 'PSI', name: 'psi', required: false, type: 'number' },
            { label: 'Ticket No.', name: 'ticket_no', required: false, type: 'text' },
            // Job info
            { label: 'Project', name: 'project', required: false, type: 'text' },
            { label: 'Contractor', name: 'contractor', required: false, type: 'text' },
            { label: 'Sample Location', name: 'sample_location', required: false, type: 'text' },
            { label: 'Location of Pour', name: 'location_of_pour', required: false, type: 'text' },
            // Delivery
            { label: 'Truck No.', name: 'truck_no', required: false, type: 'text' },
            { label: 'Date Molded', name: 'date_molded', required: false, type: 'date' },
            { label: 'Time Batched', name: 'time_batched', required: false, type: 'time' },
            { label: 'Time Sampled', name: 'time_sampled', required: false, type: 'time' },
            // Test results
            { label: 'Slump / Spread (inches)', name: 'slump_spread', required: false, type: 'text' },
            { label: 'Air Content (%)', name: 'air_content', required: false, type: 'text' },
            { label: 'Unit Weight', name: 'unit_weight', required: false, type: 'text' },
            { label: 'Concrete Temp (\u00B0F)', name: 'concrete_temp', required: false, type: 'text' },
            { label: 'Atmospheric Temp (\u00B0F)', name: 'atmospheric_temp', required: false, type: 'text' },
            // Cylinder info
            { label: 'No. of Cylinders', name: 'num_cylinders', required: false, type: 'number' },
            { label: 'Set Identifying Number', name: 'set_id_number', required: false, type: 'text' },
            { label: 'Total Sets', name: 'total_sets', required: false, type: 'number' },
            // Water
            { label: 'Water Added on Job', name: 'water_added_on_job', required: false, type: 'text' },
            { label: 'Water Requested By', name: 'water_requested_by', required: false, type: 'text' },
            // Personnel & curing
            {
                label: 'Technician',
                name: 'technician',
                required: false,
                type: 'role_select',
                roleName: 'Quality Control Technician'
            },
            {
                label: 'Initial Curing Conditions',
                name: 'initial_curing_conditions',
                required: false,
                type: 'select',
                options: ['Moisture Caps', 'Moisture Caps & Cooler', 'Cooler', 'Curing Tank']
            },
            { label: 'Picked Up and Handled By', name: 'picked_up_handled_by', required: false, type: 'text' },
            // Notes
            { label: 'Notes', name: 'notes', required: false, type: 'textarea' }
        ]
    },
    {
        name: 'third_party_lab',
        title: 'Third Party Lab Report',
        icon: 'fa-vial',
        iconBg: 'bg-rose-600',
        description: 'Report issues with third party lab results',
        permission: 'reports.qc_strength',
        reviewPermission: 'reports.review.qc_strength',
        fields: [
            { label: 'Lab Company Name', name: 'lab_company_name', required: false, type: 'text' },
            { label: 'Customer', name: 'customer', required: false, type: 'text' },
            { label: 'Order No.', name: 'order_no', required: false, type: 'text' },
            { label: 'Ticket No.', name: 'ticket_no', required: false, type: 'text' },
            { label: 'Truck No.', name: 'truck_no', required: false, type: 'text' },
            { label: 'Date', name: 'report_date', required: false, type: 'date' },
            { label: 'What did the lab do wrong?', name: 'lab_issue', required: false, type: 'textarea' },
            { label: 'Attachments', name: 'attachments', required: false, type: 'file_upload' }
        ]
    }
]
const oneOffReportTypeMap = Object.fromEntries(oneOffReportTypes.map((rt) => [rt.name, rt]))
const reportTypeMap = Object.fromEntries(reportTypes.map((rt) => [rt.name, rt]))
export { oneOffReportTypeMap, oneOffReportTypes, reportTypeMap, reportTypes }
