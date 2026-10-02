create index fp_canva_connections_connected_by_idx
on public.fp_canva_connections (connected_by);

create index fp_canva_oauth_states_user_id_idx
on public.fp_canva_oauth_states (user_id);
