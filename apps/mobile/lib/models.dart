/// Plain data models mirroring the KHRATE V1 API responses. Money is integer minor
/// units (RWF has no minor unit) — kept as int, formatted at the edge.

class Zone {
  final String id;
  final String name;
  final String currency;
  final List<DropPoint> dropPoints;
  Zone({required this.id, required this.name, required this.currency, required this.dropPoints});
  factory Zone.fromJson(Map<String, dynamic> j) => Zone(
        id: j['id'],
        name: j['name'],
        currency: j['currency'],
        dropPoints: (j['dropPoints'] as List).map((d) => DropPoint.fromJson(d)).toList(),
      );
}

class DropPoint {
  final String id;
  final String name;
  final String mode;
  DropPoint({required this.id, required this.name, required this.mode});
  factory DropPoint.fromJson(Map<String, dynamic> j) =>
      DropPoint(id: j['id'], name: j['name'], mode: j['mode']);
}

class DealLine {
  final String id;
  final String name;
  final bool isBundle;
  final List<Map<String, dynamic>>? bundleContents;
  final int groupPrice;
  final int soloPrice;
  final int saving;
  DealLine({
    required this.id,
    required this.name,
    required this.isBundle,
    this.bundleContents,
    required this.groupPrice,
    required this.soloPrice,
    required this.saving,
  });
  factory DealLine.fromJson(Map<String, dynamic> j) => DealLine(
        id: j['id'],
        name: j['name'],
        isBundle: j['isBundle'] ?? false,
        bundleContents: (j['bundleContents'] as List?)?.cast<Map<String, dynamic>>(),
        groupPrice: j['groupPrice'],
        soloPrice: j['soloPrice'],
        saving: j['saving'] ?? 0,
      );
}

class Fulfilment {
  // The deal LIST endpoint returns fulfilment for display only (mode + location name);
  // the deal DETAIL endpoint adds id + locationId used to place an order. So id is nullable.
  final String? id;
  final String mode;
  final String? location;
  final String? locationId;
  Fulfilment({this.id, required this.mode, this.location, this.locationId});
  factory Fulfilment.fromJson(Map<String, dynamic> j) =>
      Fulfilment(id: j['id'], mode: j['mode'], location: j['location'], locationId: j['locationId']);
}

class Deal {
  final String id;
  final String title;
  final String currency;
  final DateTime cutoffAt;
  final double progress;
  final bool unlocked;
  final int participants;
  final int? minUnits;
  final List<DealLine> lines;
  final List<Fulfilment> fulfilment;
  Deal({
    required this.id,
    required this.title,
    required this.currency,
    required this.cutoffAt,
    required this.progress,
    required this.unlocked,
    required this.participants,
    this.minUnits,
    required this.lines,
    required this.fulfilment,
  });
  factory Deal.fromJson(Map<String, dynamic> j) => Deal(
        id: j['id'],
        title: j['title'],
        currency: j['currency'],
        cutoffAt: DateTime.parse(j['cutoffAt']),
        progress: (j['progress'] ?? 0).toDouble(),
        unlocked: j['unlocked'] ?? false,
        participants: j['participants'] ?? 0,
        minUnits: j['minUnits'],
        lines: (j['lines'] as List).map((l) => DealLine.fromJson(l)).toList(),
        fulfilment: (j['fulfilment'] as List? ?? []).map((f) => Fulfilment.fromJson(f)).toList(),
      );
}

class OrderStatus {
  final String key;
  final String label;
  final String detail;
  OrderStatus({required this.key, required this.label, required this.detail});
  factory OrderStatus.fromJson(Map<String, dynamic> j) =>
      OrderStatus(key: j['key'], label: j['label'], detail: j['detail']);
}

class CustomerOrder {
  final String id;
  final String title;
  final int total;
  final bool paymentVerified;
  final OrderStatus status;
  final List<Map<String, dynamic>> items;
  final String? dropPoint;
  CustomerOrder({
    required this.id,
    required this.title,
    required this.total,
    required this.paymentVerified,
    required this.status,
    required this.items,
    this.dropPoint,
  });
  factory CustomerOrder.fromJson(Map<String, dynamic> j) => CustomerOrder(
        id: j['id'],
        title: j['title'],
        total: j['total'],
        paymentVerified: j['paymentVerified'] ?? false,
        status: OrderStatus.fromJson(j['status']),
        items: (j['items'] as List).cast<Map<String, dynamic>>(),
        dropPoint: j['dropPoint'],
      );
}
