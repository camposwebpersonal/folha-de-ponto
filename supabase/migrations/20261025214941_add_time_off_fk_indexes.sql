create index fp_time_off_balances_updated_by_idx
on public.fp_time_off_balances (updated_by);

create index fp_time_off_generation_logs_user_id_idx
on public.fp_time_off_generation_logs (user_id);
