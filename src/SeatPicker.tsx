import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "./api";
import { Reservation, ScreeningSeats } from "./types";

interface SeatPickerProps {
  screeningId: string;
  canReserve: boolean;
  onClose: () => void;
  onRequestLogin: () => void;
}

export default function SeatPicker({
  screeningId,
  canReserve,
  onClose,
  onRequestLogin,
}: SeatPickerProps) {
  const [screening, setScreening] = useState<ScreeningSeats | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [ticket, setTicket] = useState<Reservation | null>(null);

  useEffect(() => {
    api<ScreeningSeats>(`/screenings/${screeningId}/seats`)
      .then(setScreening)
      .catch((caughtError: Error) => setError(caughtError.message));
  }, [screeningId]);

  function toggle(id: string) {
    setError("");
    setSelected((items) => {
      if (items.includes(id)) return items.filter((item) => item !== id);
      if (items.length >= 8) {
        setError("Vous pouvez réserver jusqu’à 8 places à la fois.");
        return items;
      }
      return [...items, id];
    });
  }

  async function reserve() {
    setError("");
    setIsReserving(true);
    try {
      const result = await api<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify({ screeningId, seatIds: selected }),
      });
      setTicket(result);
      setSelected([]);
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setIsReserving(false);
    }
  }

  async function pay() {
    if (!ticket) return;
    setError("");
    setIsPaying(true);
    try {
      await api(`/reservations/${ticket.id}/payment`, { method: "POST" });
      setTicket({
        ...ticket,
        paymentStatus: "PAID",
        ticketStatus: "ACTIVE",
      });
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setIsPaying(false);
    }
  }

  if (!screening) return <p className="loading">Chargement des places…</p>;

  const selectedSeats = screening.seats.filter((seat) =>
    selected.includes(seat.id),
  );
  const sortedSeats = [...screening.seats].sort((left, right) =>
    left.label.localeCompare(right.label, "fr", { numeric: true }),
  );
  const total = selected.length * screening.priceCents;
  const qrValue = ticket
    ? JSON.stringify({
        reservationId: ticket.id,
        ticketCode: ticket.ticketCode,
        screeningId: ticket.screening.id,
      })
    : "";

  return (
    <section className="booking-panel" aria-labelledby="seat-picker-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Plan de salle</p>
          <h2 id="seat-picker-title">{screening.movie.title}</h2>
          <p>
            {new Date(screening.startsAt).toLocaleString("fr-FR")} ·{" "}
            {screening.room}
          </p>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {!ticket && (
        <div className="seat-layout">
          <div className="screen" aria-hidden="true">
            Écran
          </div>
          <div className="seat-grid" aria-label="Choix des places">
            {sortedSeats.map((seat) => {
              const isSelected = selected.includes(seat.id);
              return (
                <button
                  className={`seat ${isSelected ? "seat-selected" : ""}`}
                  key={seat.id}
                  type="button"
                  disabled={!seat.available}
                  aria-pressed={isSelected}
                  aria-label={`Place ${seat.label}${seat.available ? "" : ", occupée"}`}
                  onClick={() => toggle(seat.id)}
                >
                  {seat.label}
                </button>
              );
            })}
          </div>
          <div className="seat-legend" aria-label="Légende">
            <span>
              <i className="seat-sample seat-available" />
              Disponible
            </span>
            <span>
              <i className="seat-sample seat-selected" />
              Sélectionnée
            </span>
            <span>
              <i className="seat-sample seat-occupied" />
              Occupée
            </span>
          </div>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <div className="booking-summary">
            <div>
              <span>{selected.length} place(s)</span>
              <strong>
                {selectedSeats.map((seat) => seat.label).join(", ") || "Aucune"}
              </strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{(total / 100).toFixed(2)} €</strong>
            </div>
            {canReserve ? (
              <button
                className="button button-primary"
                disabled={!selected.length || isReserving}
                type="button"
                onClick={reserve}
              >
                {isReserving ? "Réservation…" : "Confirmer la réservation"}
              </button>
            ) : (
              <button
                className="button button-primary"
                type="button"
                onClick={onRequestLogin}
              >
                Se connecter pour réserver
              </button>
            )}
          </div>
        </div>
      )}

      {ticket && (
        <article className="ticket">
          <div className="ticket-main">
            <div>
              <p className="eyebrow">Billet numérique</p>
              <h3>{ticket.screening.movie.title}</h3>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>
                    {new Date(ticket.screening.startsAt).toLocaleString(
                      "fr-FR",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Salle</dt>
                  <dd>{ticket.screening.room}</dd>
                </div>
                <div>
                  <dt>Places</dt>
                  <dd>
                    {ticket.seats.map((item) => item.seat.label).join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{(ticket.totalCents / 100).toFixed(2)} €</dd>
                </div>
              </dl>
              <p className="ticket-code">Billet nº {ticket.ticketCode}</p>
              <p>
                Paiement : {ticket.paymentStatus === "PAID" ? "payé" : "en attente"}
              </p>
            </div>
            {ticket.paymentStatus === "PAID" ? (
              <div className="qr-code" aria-label="QR code du billet">
                <QRCodeSVG value={qrValue} size={164} level="M" includeMargin />
                <span>Présentez ce code à l’entrée</span>
              </div>
            ) : (
              <div className="qr-code">
                <strong>Billet en attente</strong>
                <span>Le QR code sera activé après le paiement.</span>
              </div>
            )}
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
          <div className="ticket-actions">
            {ticket.paymentStatus !== "PAID" && (
              <button
                className="button button-primary"
                type="button"
                disabled={isPaying}
                onClick={pay}
              >
                {isPaying
                  ? "Paiement…"
                  : `Payer ${(ticket.totalCents / 100).toFixed(2)} €`}
              </button>
            )}
            <button
              className="button button-ghost"
              type="button"
              onClick={onClose}
            >
              Revenir aux séances
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
