-- Update team leaders for The Teams section
-- Run this in Supabase SQL Editor -> New query -> Run

update public.teams
set captain = 'Sinan Pv',
    vice_captain = 'Afnan',
    vice_captain2 = 'Irfan Ali'
where name = 'Nova';

update public.teams
set captain = 'Riyan',
    vice_captain = 'Shahinsha',
    vice_captain2 = 'Rishan TT'
where name = 'Zoro';

update public.teams
set captain = 'Abdusamad',
    vice_captain = 'Salahudheen',
    vice_captain2 = 'Irshad'
where name = 'Efe';

update public.teams
set captain = 'Ameen',
    vice_captain = 'Jaseem',
    vice_captain2 = 'Nashid'
where name = 'Fizo';
