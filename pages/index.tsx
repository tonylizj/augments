import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { augmentList, augmentListPBE } from '../data/augmentList';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTable } from 'react-table';
import { isMobile } from 'react-device-detect';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';
import Link from 'next/link';

const LIVE = 'LIVE';
const PBE = 'PBE';

type Seqs = {
  p: string;
  a1: string;
  a2: string;
  a3: string;
}[];

type Columns = {
  Header: string;
  accessor: 'p' | 'a1' | 'a2' | 'a3';
}[];

const rarities = ['', 'Silver', 'Gold', 'Prismatic', 'Hero'];

/**
 * 
 * Return valid augment sequences sorted by probability
 * 
 * TODO: when user clicks at end of valid sequence, it shouldnt continue
 * 
 * @param choices: augments selected so far
 * @param usePBE 
 * @returns Filtered sequences and the total probability 
 */
const validSeqsByP = (choices: Array<number>, usePBE: boolean) => {
  let totalP = 0;

  const augments = usePBE ? augmentListPBE : augmentList;

  const processed = augments.filter((x) => {
    if (x.slice(0, choices.length).toString() === choices.toString()) {
      totalP += x[3];
      return true;
    }
    return false;
  }).sort((a, b) => b[3] - a[3]);

  return {
    data: processed,
    totalP: totalP,
  };
};

/**
 * Same as validSeqsByP but returns in no specific order
 * 
 * @param choices 
 * @param usePBE 
 * @returns 
 */
const validSeqsByR = (choices: Array<number>, usePBE: boolean) => {
  let totalP = 0;

  const augments = usePBE ? augmentListPBE : augmentList;

  const processed = augments.filter((x) => {
    if (x.slice(0, choices.length).toString() === choices.toString()) {
      totalP += x[3];
      return true;
    }
    return false;
  }).sort((a, b) => ((b[0] - a[0] > 0) || (b[1] - a[1] > 0) || (b[2] - a[2] > 0)) ? -1 : 1);

  return {
    data: processed,
    totalP: totalP,
  };
};

const formatData = (sortedData: number[][], totalP: number) => {
  return sortedData.map((x) => {
    return {
      p: Math.round(100 * x[3] / totalP).toString() + '%',
      a1: rarities[x[0]],
      a2: rarities[x[1]],
      a3: rarities[x[2]],
    };
  });
};

// function for calculating the decision tree probabilities
const nextP = (
  choices: Array<number>,
  rarity: number,
  usePBE: boolean,
) => {
  let totalMatchingP = 0;

  if (choices.length === 3) return '0%';

  const res = validSeqsByP(choices, usePBE);
  const sortedData = res.data;
  const totalP = res.totalP;

  sortedData.forEach((x) => {
    if (x[choices.length] === rarity) {
      totalMatchingP += x[3];
    }
  });

  return Math.round(100 * totalMatchingP / totalP).toString() + '%';
};

interface PTableProps {
  data: Seqs,
  columns: Columns,
  mobile: boolean,
};

const PTable: FC<PTableProps> = ({ data, columns, mobile }: PTableProps) => {  
  const tableInstance = useTable({ columns, data });

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance;

  return (
    // apply the table props
    <table {...getTableProps([
      {
        className: styles.table,
      },
    ])}>
      <thead>
        {// Loop over the header rows
        headerGroups.map(headerGroup => (
          // Apply the header row props
          // eslint-disable-next-line react/jsx-key
          <tr {...headerGroup.getHeaderGroupProps()}>
            {// Loop over the headers in each row
            headerGroup.headers.map(column => (
              // Apply the header cell props
              // eslint-disable-next-line react/jsx-key
              <th {...column.getHeaderProps([
                {
                  className: mobile ? styles.tableHeaderMobile : styles.tableHeader,
                },
              ])}>
                {// Render the header
                column.render('Header')}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      {/* Apply the table body props */}
      <tbody {...getTableBodyProps()}>
        {// Loop over the table rows
        rows.map(row => {
          // Prepare the row for display
          prepareRow(row);
          return (
            // Apply the row props
            // eslint-disable-next-line react/jsx-key
            <tr {...row.getRowProps()}>
              {// Loop over the rows cells
              row.cells.map(cell => {
                // Apply the cell props
                return (
                  // eslint-disable-next-line react/jsx-key
                  <td {...cell.getCellProps([
                    {
                      className: cell.value === 'Silver' ?
                      `${mobile ? styles.tableCellMobile : styles.tableCell} ${styles.tableCellSilver}`
                      :
                      cell.value === 'Gold' ?
                      `${mobile ? styles.tableCellMobile : styles.tableCell} ${styles.tableCellGold}`
                      :
                      cell.value === 'Prismatic' ?
                      `${mobile ? styles.tableCellMobile : styles.tableCell} ${styles.tableCellPrismatic}`
                      :
                      cell.value === 'Hero' ?
                      `${mobile ? styles.tableCellMobile: styles.tableCell} ${styles.tableCellHero}`
                      :
                      mobile ? styles.tableCellMobile : styles.tableCell
                    },
                  ])}>
                    {// Render the cell contents
                    cell.render('Cell')}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  )
};


const Home: NextPage = () => {
  const [choices, setChoices] = useState<number[]>([]);
  const [sortedP, setSortedP] = useState<boolean>(true);
  const [mobile, setMobile] = useState<boolean>(false);
  const [patchline, setPatchline] = useState<string>('');

  const usePBE = patchline === PBE;

  useEffect(() => {
    setMobile(isMobile);
  }, [mobile]);

  const seqs: Seqs = useMemo(() => {
    const res = sortedP ? validSeqsByP(choices, usePBE) : validSeqsByR(choices, usePBE);
    return formatData(res.data, res.totalP);
  }, [choices, sortedP, usePBE]);

  const columns: Columns = useMemo(() => [
    {
      Header: 'Probability',
      accessor: 'p',
    },
    {
      Header: 'Augment 1',
      accessor: 'a1',
    },
    {
      Header: 'Augment 2',
      accessor: 'a2',
    },
    {
      Header: 'Augment 3',
      accessor: 'a3',
    },
  ], []);

  // probability that next augment will be <type>
  const nextPs = [nextP(choices, 1, usePBE), nextP(choices, 2, usePBE), nextP(choices, 3, usePBE), nextP(choices, 4, usePBE)];

  return (
    <div className={mobile ? styles.containerMobile : styles.container}>
      <Head>
        <title>TFT Augment Sequences</title>
        <meta name="description" content="Augment sequence probabilities for TFT." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {patchline === '' ?
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: '5rem' }}>
          <button
            className={mobile ? styles.cardMobile : styles.card}
            onClick={() => setPatchline(LIVE)}
          >
            Set 8 (LIVE)
          </button>
          <button
            className={mobile ? styles.cardMobile : styles.card}
            onClick={() => setPatchline(PBE)}
          >
            Set 8 : 13.2 (PBE)
          </button>
        </div>
        :
        <main className={styles.main}>
          <button
            className={mobile ? styles.cardMobile : styles.card}
            onClick={() => setPatchline('')}
          >
            Change Patchline (Current: {patchline})
          </button>
          <div className={mobile ? styles.gridMobile : styles.grid}>
            <p className={mobile ? styles.descriptionMobile : styles.description}>Current choices:</p>
            {choices.length === 0 ?
              <p className={mobile ? styles.cardMobile : styles.card}>
                None
              </p>
              :
              choices.map((x, i) => (
                <p className={mobile ? styles.cardMobile : styles.card} key={i}>
                  {rarities[x]}
                </p>
              ))
            }
          </div>
          <div className={mobile ? styles.gridMobile : styles.grid}>
            <button
              className={`${mobile ? styles.cardMobile : styles.card} ${styles.buttonSilver}`}
              onClick={() => setChoices((x) => [...x, 1])}
              disabled={choices.length >= 3}
            >
              <p>Silver <b>{nextPs[0]}</b></p>
            </button>

            <button
              className={`${mobile ? styles.cardMobile : styles.card} ${styles.buttonGold}`}
              onClick={() => setChoices((x) => [...x, 2])}
              disabled={choices.length >= 3}
            >
              <p>Gold <b>{nextPs[1]}</b></p>
            </button>

            <button
              className={`${mobile ? styles.cardMobile : styles.card} ${styles.buttonPrismatic}`}
              onClick={() => setChoices((x) => [...x, 3])}
              disabled={choices.length >= 3}
            >
              <p>Prismatic <b>{nextPs[2]}</b></p>
            </button>

            <button 
              className={`${mobile ? styles.cardMobile : styles.card} ${styles.buttonHero}`}
              onClick={() => setChoices((x) => [...x, 4])}
              disabled={choices.length >= 3}
            >
              <p>Hero <b>{nextPs[3]}</b></p>
            </button>

            <button
              className={mobile ? styles.cardMobile : styles.card}
              onClick={() => setChoices([])}
              disabled={choices.length === 0}
            >
              Reset
            </button>
          </div>
          <div className={styles.toggleLabel}>
            <span className={mobile ? styles.descriptionMobile : styles.description}>Sort by probability</span>
            <Toggle checked={sortedP} onChange={(e) => {
              e.target.checked ?
              setSortedP(true)
              :
              setSortedP(false)
            }} />
          </div>
          <PTable data={seqs} columns={columns} mobile={mobile} />
          <p className={styles.source}>Data up to date as of patch 13.1 from&nbsp;
          <Link href="https://www.reddit.com/r/CompetitiveTFT/comments/108lq8v/updated_augment_odds_table_for_patch_131/">
            <a target="_blank" rel="noreferrer">here</a>
          </Link>
          {' '}
          please contact / make a pull request for corrections.</p>
          <Link href="https://github.com/tonylizj/augments">
            <a className={styles.source} target="_blank" rel="noreferrer">Source code: https://github.com/tonylizj/augments</a>
          </Link>
        </main>
      }
    </div>
  )
};

export default Home;
