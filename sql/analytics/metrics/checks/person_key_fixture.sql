-- Standalone BigQuery script: deterministic key contract examples, no live data.
CREATE TEMP TABLE fixture AS
SELECT * FROM UNNEST([
 STRUCT('one' AS client_id,'alice' AS user_id,FALSE AS is_guest,'u:alice' AS expected),
 STRUCT('one','anonymous',TRUE,'u:alice'),
 STRUCT('one',CAST(NULL AS STRING),CAST(NULL AS BOOL),'u:alice'),
 STRUCT('two','alice',FALSE,'u:alice'),
 STRUCT('two','bob',FALSE,'u:bob'),
 STRUCT('two','temporary',TRUE,'c:two'),
 STRUCT('guest','temporary',TRUE,'c:guest'),
 STRUCT('null_login',CAST(NULL AS STRING),FALSE,'c:null_login'),
 STRUCT('other_device','alice',FALSE,'u:alice')]);
CREATE TEMP TABLE keys AS
WITH accounts AS (
 SELECT client_id,COUNT(DISTINCT user_id) n,MIN(user_id) account
 FROM fixture WHERE is_guest=FALSE AND user_id IS NOT NULL GROUP BY 1
)
SELECT f.*,CASE WHEN is_guest=FALSE AND user_id IS NOT NULL THEN CONCAT('u:',user_id)
 WHEN a.n=1 THEN CONCAT('u:',a.account) ELSE CONCAT('c:',client_id) END actual
FROM fixture f LEFT JOIN accounts a USING(client_id);
ASSERT (SELECT COUNTIF(actual!=expected OR actual IS NULL) FROM keys)=0
 AS 'Person-key contract: single account merges, multiple accounts stay guest, NULL means guest';
SELECT 'person_key_fixture' AS check_name,COUNT(*) AS cases,'PASS' AS status FROM keys;
