export type Role = "USER" | "ADMIN";
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}
export interface Screening {
  id: string;
  startsAt: string;
  room: string;
  priceCents: number;
}
export interface Movie {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  screenings: Screening[];
}
export interface Seat {
  id: string;
  label: string;
  available: boolean;
}
export interface ScreeningSeats extends Screening {
  movie: Movie;
  seats: Seat[];
}
export interface Reservation {
  id: string;
  ticketCode: string;
  totalCents: number;
  status: string;
  paymentStatus: "PENDING" | "PAID" | "REFUSED" | "REFUNDED";
  ticketStatus: "PENDING_PAYMENT" | "ACTIVE" | "USED" | "CANCELLED";
  seats: { seat: Seat }[];
  screening: Screening & { movie: Movie };
}
