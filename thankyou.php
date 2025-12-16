<?php
$serverName = "MYPC\\SQLEXPRESS";
$connectionOptions = [
    "Database" => "dlsu",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
$db_ok = $conn !== false;
$error_message = '';
if (!$db_ok) {
    $error_message = 'Database connection failed.';
}

$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : '';
$hotel = isset($_GET['hotel']) ? $_GET['hotel'] : '';
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';
$guests = isset($_GET['guests']) ? intval($_GET['guests']) : 0;
$nights = isset($_GET['nights']) ? intval($_GET['nights']) : 0;
$total_amount = isset($_GET['total']) ? floatval($_GET['total']) : 0;
$image_url = isset($_GET['image']) ? $_GET['image'] : '';
$booking_date = date('Y-m-d H:i:s');

$booking_saved = false;

if (!empty($hotel) && !empty($start_date) && !empty($end_date) && $db_ok) {
    $sql = "INSERT INTO BOOKING
    (user_id, hotel_name, start_date, end_date, guests, nights, total_amount, booking_date, status, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)";

    $params = [
        $user_id, $hotel, $start_date, $end_date, $guests, $nights, $total_amount, $booking_date, $image_url
    ];

    $query = sqlsrv_query($conn, $sql, $params);

    if ($query) {
        $booking_saved = true;
    } else {
        $error_message = 'Failed to save booking details.';
    }
}

sqlsrv_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"
      crossorigin="anonymous"
    />
    <title>Thank You - Tara-Trip!</title>
    <style>
        body {
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            background: url('images/hero.jpg') no-repeat center center fixed;
            background-size: cover;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .thank-you-card {
            background: white;
            border-radius: 2rem;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            max-width: 500px;
            width: 90%;
            padding: 3rem;
            text-align: center;
        }

        .check-icon {
            width: 80px;
            height: 80px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }

        .check-icon svg {
            width: 40px;
            height: 40px;
            color: white;
        }

        .booking-details {
            background: #f8f9fa;
            border-radius: 1rem;
            padding: 1.5rem;
            margin: 1.5rem 0;
            text-align: left;
        }

        .booking-details .row {
            padding: 0.5rem 0;
            border-bottom: 1px solid #e9ecef;
        }

        .booking-details .row:last-child {
            border-bottom: none;
        }

        .booking-details .label {
            color: #6c757d;
            font-size: 0.875rem;
        }

        .booking-details .value {
            font-weight: 600;
            color: #212529;
        }

        .total-row {
            background: #212529;
            color: white;
            border-radius: 0.5rem;
            padding: 1rem !important;
            margin-top: 0.5rem;
        }

        .total-row .label,
        .total-row .value {
            color: white;
            font-size: 1.1rem;
        }
    </style>
</head>
<body>
    <div class="thank-you-card">
        <?php if ($booking_saved || !empty($hotel)): ?>
            <div class="check-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 class="mb-2">Thank You!</h1>
            <p class="text-muted mb-4">Your booking has been confirmed successfully.</p>

            <div class="booking-details">
                <div class="row g-0 align-items-center">
                    <div class="col-5">
                        <span class="label">Hotel</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value"><?php echo htmlspecialchars($hotel); ?></span>
                    </div>
                </div>
                <div class="row g-0 align-items-center">
                    <div class="col-5">
                        <span class="label">Check-in</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value"><?php echo htmlspecialchars($start_date); ?></span>
                    </div>
                </div>
                <div class="row g-0 align-items-center">
                    <div class="col-5">
                        <span class="label">Check-out</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value"><?php echo htmlspecialchars($end_date); ?></span>
                    </div>
                </div>
                <div class="row g-0 align-items-center">
                    <div class="col-5">
                        <span class="label">Guests</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value"><?php echo $guests; ?> pax</span>
                    </div>
                </div>
                <div class="row g-0 align-items-center">
                    <div class="col-5">
                        <span class="label">Duration</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value"><?php echo $nights; ?> night(s)</span>
                    </div>
                </div>
                <div class="row g-0 align-items-center total-row">
                    <div class="col-5">
                        <span class="label">Total Paid</span>
                    </div>
                    <div class="col-7 text-end">
                        <span class="value">₱<?php echo number_format($total_amount, 2); ?></span>
                    </div>
                </div>
            </div>

            <p class="text-muted small mb-4">
                A confirmation email will be sent to your registered email address.
            </p>

            <a href="index.html" class="btn btn-dark btn-lg rounded-pill px-5">
                Back to Home
            </a>
        <?php else: ?>
            <div class="check-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <h1 class="mb-2">Oops!</h1>
            <p class="text-muted mb-4">No booking information found. Please try booking again.</p>
            <a href="index.html" class="btn btn-dark btn-lg rounded-pill px-5">
                Back to Home
            </a>
        <?php endif; ?>
    </div>

    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI"
      crossorigin="anonymous"
    ></script>
</body>
</html>
