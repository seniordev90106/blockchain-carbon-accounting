DROP TABLE IF EXISTS csv_project;
CREATE TABLE csv_project (
    project_id text,
    project_name text,
    registry text,
    arb_project text,
    voluntary_status text,
    scope text,
    project_type text,
    methodology_protocol text,
    project_site_region text,
    project_site_country text,
    project_site_state text,
    project_site_location text,
    project_developer text,
    total_credits_issued bigint,
    total_credits_retired bigint,
    total_credits_remaining bigint,
    first_year_of_project integer,
    issued_by_reporting_1996 bigint,
    issued_by_reporting_1997 bigint,
    issued_by_reporting_1998 bigint,
    issued_by_reporting_1999 bigint,
    issued_by_reporting_2000 bigint,
    issued_by_reporting_2001 bigint,
    issued_by_reporting_2002 bigint,
    issued_by_reporting_2003 bigint,
    issued_by_reporting_2004 bigint,
    issued_by_reporting_2005 bigint,
    issued_by_reporting_2006 bigint,
    issued_by_reporting_2007 bigint,
    issued_by_reporting_2008 bigint,
    issued_by_reporting_2009 bigint,
    issued_by_reporting_2010 bigint,
    issued_by_reporting_2011 bigint,
    issued_by_reporting_2012 bigint,
    issued_by_reporting_2013 bigint,
    issued_by_reporting_2014 bigint,
    issued_by_reporting_2015 bigint,
    issued_by_reporting_2016 bigint,
    issued_by_reporting_2017 bigint,
    issued_by_reporting_2018 bigint,
    issued_by_reporting_2019 bigint,
    issued_by_reporting_2020 bigint,
    issued_by_reporting_2021 bigint,
    retired_1996 bigint,
    retired_1997 bigint,
    retired_1998 bigint,
    retired_1999 bigint,
    retired_2000 bigint,
    retired_2001 bigint,
    retired_2002 bigint,
    retired_2003 bigint,
    retired_2004 bigint,
    retired_2005 bigint,
    retired_2006 bigint,
    retired_2007 bigint,
    retired_2008 bigint,
    retired_2009 bigint,
    retired_2010 bigint,
    retired_2011 bigint,
    retired_2012 bigint,
    retired_2013 bigint,
    retired_2014 bigint,
    retired_2015 bigint,
    retired_2016 bigint,
    retired_2017 bigint,
    retired_2018 bigint,
    retired_2019 bigint,
    retired_2020 bigint,
    retired_2021 bigint,
    retired_unknown bigint,
    remaining_1996 bigint,
    remaining_1997 bigint,
    remaining_1998 bigint,
    remaining_1999 bigint,
    remaining_2000 bigint,
    remaining_2001 bigint,
    remaining_2002 bigint,
    remaining_2003 bigint,
    remaining_2004 bigint,
    remaining_2005 bigint,
    remaining_2006 bigint,
    remaining_2007 bigint,
    remaining_2008 bigint,
    remaining_2009 bigint,
    remaining_2010 bigint,
    remaining_2011 bigint,
    remaining_2012 bigint,
    remaining_2013 bigint,
    remaining_2014 bigint,
    remaining_2015 bigint,
    remaining_2016 bigint,
    remaining_2017 bigint,
    remaining_2018 bigint,
    remaining_2019 bigint,
    remaining_2020 bigint,
    remaining_2021 bigint,
    project_owner text,
    offset_project_operator text,
    authorized_project_designee text,
    verifier text,
    estimated_annual_emission_reductions bigint,
    pers text,
    registry_and_arb text,
    arb_project_detail text,
    arb_id text,
    project_listed text,
    project_registered text,
    active_ccb_status text,
    project_sector text,
    registry_documents text,
    project_website text,
    issued_1996 bigint,
    issued_1997 bigint,
    issued_1998 bigint,
    issued_1999 bigint,
    issued_2000 bigint,
    issued_2001 bigint,
    issued_2002 bigint,
    issued_2003 bigint,
    issued_2004 bigint,
    issued_2005 bigint,
    issued_2006 bigint,
    issued_2007 bigint,
    issued_2008 bigint,
    issued_2009 bigint,
    issued_2010 bigint,
    issued_2011 bigint,
    issued_2012 bigint,
    issued_2013 bigint,
    issued_2014 bigint,
    issued_2015 bigint,
    issued_2016 bigint,
    issued_2017 bigint,
    issued_2018 bigint,
    issued_2019 bigint,
    issued_2020 bigint,
    issued_2021 bigint,
    notes_from_registry text,
    notes text,
    date_project_added_to_database text,
    year_of_first_issuance integer
);

COPY csv_project FROM STDIN WITH (FORMAT CSV, HEADER);

-- do some cleanup:
-- remove NA values from developer (will use NULL instead)
update csv_project set project_developer = null where project_developer = 'NA';
-- remove the VCS prefix from project IDs
update csv_project set project_id = regexp_replace(project_id, E'^VCS', '');
-- add UUIDs for tracking our project Ids
alter table csv_project add id uuid;
update csv_project set id = uuid_generate_v4();
-- cleanup broken dates...
update csv_project set project_listed = null where project_listed ~ '^\d+$';
update csv_project set project_registered = null where project_registered ~ '^\d+$';

-- cleanup previous data ?
delete from retirement;
delete from issuance;
delete from project_rating;
delete from project_registry;
delete from project;

-- now populate the actual DB data
insert into project (
    id,
    project_name,
    scope,
    type,
    project_site_region,
    project_site_country,
    project_site_state,
    project_site_location,
    developer,
    total_issued,
    total_retired,
    total_outstanding,
    first_project_year,
    total_issued_future_years,
    total_retired_unknown_years,
    project_owner,
    offset_project_operator,
    authorized_project_designee,
    voluntary_status,
    project_website,
    notes,
    date_added,
    source,
    by_user
) select
    id,
    project_name,
    scope,
    project_type,
    project_site_region,
    project_site_country,
    project_site_state,
    project_site_location,
    project_developer,
    total_credits_issued,
    total_credits_retired,
    total_credits_remaining,
    first_year_of_project,
    0,
    retired_unknown,
    project_owner,
    offset_project_operator,
    authorized_project_designee,
    voluntary_status,
    project_website,
    trim(coalesce(notes_from_registry, '') || ' ' || coalesce(notes, '')),
    TO_DATE(date_project_added_to_database,'YYYYMM'),
    'Berkeley Carbon Trading Project.  Barbara Haya, Micah Elias, Ivy So. (2021, September). Voluntary Registry Offsets Database, Berkeley Carbon Trading Project, Center for Environmental Public Policy, University of California, Berkeley. Retrieved from: https://gspp.berkeley.edu/faculty-and-impact/centers/cepp/projects/berkeley-carbon-trading-project/offsets-database',
    'csv import'
from csv_project;

-- now populate the actual DB data
insert into project_registry (
    id,
    project_id,
    registry_project_id,
    arb_project,
    arb_id,
    registry_and_arb,
    project_type,
    methodology_protocol,
    project_listed,
    project_registered,
    active_ccb_status,
    registry_documents
) select
    uuid_generate_v4(),
    id,
    project_id,
    arb_project,
    arb_id,
    registry_and_arb,
    project_type,
    methodology_protocol,
    TO_DATE(project_listed,'MM/DD/YY'),
    TO_DATE(project_registered,'MM/DD/YY'),
    active_ccb_status,
    registry_documents
from csv_project;

-- cleanup
update project_registry set methodology_protocol = null where methodology_protocol = 'NULL';
update project_registry set methodology_protocol = null where trim(methodology_protocol) = '';

-- update Verra registry links
update project_registry
set registry_documents = 'https://registry.verra.org/app/projectDetail/VCS/' || registry_project_id
where registry_and_arb = 'VCS';

-- now populate the actual DB data
insert into project_rating (
    id,
    project_id,
    rated_by,
    rating_documents,
    rating_type
) select
    uuid_generate_v4(),
    id,
    registry_and_arb,
    registry_documents,
    'Standards Organization'
from csv_project;

-- Also impor tthe Verifiers
insert into project_rating (
    id,
    project_id,
    rated_by,
    rating_type
) select
    uuid_generate_v4(),
    id,
    verifier,
    'Verifier'
from csv_project
where verifier is not null;

-- update Verra registry links
update project_rating p
set rating_documents = 'https://registry.verra.org/app/projectDetail/VCS/' || tmp.registry_project_id
from (
select p.id, pr.registry_project_id, pr.registry_and_arb from project_rating p
join project_registry pr on p.project_id = pr.project_id
where pr.registry_and_arb = 'VCS'
) tmp
where p.id = tmp.id;
