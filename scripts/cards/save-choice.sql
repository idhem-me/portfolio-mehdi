-- Test transactionnel : toutes les données de test sont annulées à la fin.
begin;
insert into auth.users(id,aud,role) values('00000000-0000-4000-8000-000000000001','authenticated','authenticated'),('00000000-0000-4000-8000-000000000002','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',true);
do $$declare ticket text; pending jsonb; snapshot jsonb;begin
perform public.grant_credits('credits-100');
ticket:=public.cards_prepare_login();
perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
perform public.grant_credits('credits-500');
if public.cards_claim_login(ticket) is not false then raise exception 'CONFLICT NOT DETECTED';end if;
pending:=public.cards_pending_choice();
if pending#>>'{device,credits}'<>'100' or pending#>>'{account,credits}'<>'500' then raise exception 'PREVIEW FAILED';end if;
begin perform public.grant_credits('credits-100');raise exception 'PENDING PURCHASE ALLOWED';exception when others then if sqlerrm<>'SAVE_CHOICE_REQUIRED' then raise;end if;end;
begin perform public.cards_resolve_choice('device',999999,999999);raise exception 'STALE CHOICE ALLOWED';exception when others then if sqlerrm<>'SAVE_CHANGED' then raise;end if;end;
snapshot:=public.cards_resolve_choice('account',(pending->>'revision')::bigint,(pending->>'sourceRevision')::bigint);
if snapshot#>>'{profile,credits}'<>'500' then raise exception 'MERGE OCCURRED';end if;
begin perform public.cards_import_legacy_for('00000000-0000-4000-8000-000000000002','{}');raise exception 'PRIVILEGED IMPORT ALLOWED';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin if exists(select 1 from public.profiles where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'LOSER REMAINS';end if;end$$;
rollback;
