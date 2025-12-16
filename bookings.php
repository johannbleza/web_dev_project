<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$serverName = "MYPC\\SQLEXPRESS";
$connectionOptions = [
    "Database" => "dlsu",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'GET') {
    $userId = isset($_GET['userId']) ? $_GET['userId'] : '';

    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required', 'userId' => $userId]);
        exit();
    }

    $sql = "SELECT
                id,
                user_id,
                hotel_name,
                start_date,
                end_date,
                guests,
                nights,
                total_amount,
                booking_date,
                status,
                image_url
            FROM BOOKING
            WHERE user_id = ?
            ORDER BY booking_date DESC";

    $params = [$userId];
    $query = sqlsrv_query($conn, $sql, $params);

    if ($query === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch bookings']);
        exit();
    }

    $bookings = [];
    while ($row = sqlsrv_fetch_array($query, SQLSRV_FETCH_ASSOC)) {

        $startDate = $row['start_date'];
        $endDate = $row['end_date'];
        $bookingDate = $row['booking_date'];

        if ($startDate instanceof DateTime) {
            $startDate = $startDate->format('Y-m-d');
        }
        if ($endDate instanceof DateTime) {
            $endDate = $endDate->format('Y-m-d');
        }
        if ($bookingDate instanceof DateTime) {
            $bookingDate = $bookingDate->format('Y-m-d H:i:s');
        }


        $totalAmount = floatval($row['total_amount']);
        $nights = intval($row['nights']);
        $pricePerNight = $nights > 0 ? round($totalAmount / $nights, 2) : $totalAmount;


        $booking = [
            'booking_id' => $row['id'],
            'user_id' => $row['user_id'],
            'hotel' => $row['hotel_name'],
            'startDate' => $startDate,
            'endDate' => $endDate,
            'guests' => intval($row['guests']),
            'nights' => $nights,
            'pricePerNight' => $pricePerNight,
            'booking_date' => $bookingDate,
            'status' => !empty($row['status']) ? $row['status'] : 'confirmed',
            'image' => !empty($row['image_url']) ? $row['image_url'] : ''
        ];

        $bookings[] = $booking;
    }

    echo json_encode(['bookings' => $bookings, 'count' => count($bookings)]);
    sqlsrv_close($conn);
    exit();
}


elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $userId = $data['userId'] ?? '';
    $hotel = $data['hotel'] ?? '';
    $startDate = $data['startDate'] ?? '';
    $endDate = $data['endDate'] ?? '';
    $guests = $data['guests'] ?? 0;
    $nights = $data['nights'] ?? 0;
    $totalAmount = $data['totalAmount'] ?? 0;
    $image = $data['image'] ?? '';
    $bookingDate = date('Y-m-d H:i:s');

    if (empty($hotel) || empty($startDate) || empty($endDate)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit();
    }

    $sql = "INSERT INTO BOOKING
            (user_id, hotel_name, start_date, end_date, guests, nights, total_amount, booking_date, status, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)";

    $params = [$userId, $hotel, $startDate, $endDate, $guests, $nights, $totalAmount, $bookingDate, $image];
    $query = sqlsrv_query($conn, $sql, $params);

    if ($query === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create booking']);
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'Booking created successfully']);
    sqlsrv_close($conn);
    exit();
}


elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    $bookingId = $data['bookingId'] ?? '';
    $startDate = $data['startDate'] ?? '';
    $endDate = $data['endDate'] ?? '';
    $guests = $data['guests'] ?? 0;

    if (empty($bookingId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Booking ID is required']);
        exit();
    }


    if (!empty($startDate) && !empty($endDate)) {
        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $nights = $start->diff($end)->days;

        $sql = "UPDATE BOOKING
                SET start_date = ?, end_date = ?, guests = ?, nights = ?
                WHERE id = ?";

        $params = [$startDate, $endDate, $guests, $nights, $bookingId];
    } else {
        $sql = "UPDATE BOOKING
                SET guests = ?
                WHERE id = ?";

        $params = [$guests, $bookingId];
    }

    $query = sqlsrv_query($conn, $sql, $params);

    if ($query === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update booking']);
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'Booking updated successfully']);
    sqlsrv_close($conn);
    exit();
}


elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $bookingId = $data['bookingId'] ?? '';

    if (empty($bookingId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Booking ID is required']);
        exit();
    }

    $sql = "DELETE FROM BOOKING WHERE id = ?";
    $params = [$bookingId];
    $query = sqlsrv_query($conn, $sql, $params);

    if ($query === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete booking']);
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'Booking deleted successfully']);
    sqlsrv_close($conn);
    exit();
}

else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    sqlsrv_close($conn);
    exit();
}
?>
