import random
import statistics
import sys

RATE = {'wood': 20, 'stone': 12, 'coal': 8, 'fish': 8, 'crop': 5, 'seed': 5, 'forage': 6}
KILN = {'charcoal': {'wood': 8}, 'brick': {'stone': 6, 'coal': 2}}
KILN_SLOTS, KILN_YIELD = 2, 3.5
FOG_P, FOG_GEMS = 0.13, 2
TRAVEL = 1.0
OBSERVE_MIN = 0.3

BRANCHES = ['water', 'farm', 'kitchen', 'forest']
OPEN_DAY = {'water': 1, 'farm': 2, 'kitchen': 2, 'forest': 3}

STAGES = {
    'water':   [{'fish': 12, 'stone': 20}, {'fish': 20, 'wood': 40}, {'fish': 30, 'brick': 4}],
    'farm':    [{'crop': 30, 'seed': 10}, {'crop': 45, 'wood': 30}, {'crop': 60, 'charcoal': 4}],
    'kitchen': [{'crop': 20, 'fish': 10, 'coal': 10}, {'charcoal': 4, 'stone': 30}, {'brick': 5, 'fish': 20, 'crop': 20}],
    'forest':  [{'wood': 60, 'stone': 20}, {'forage': 15, 'wood': 40}, {'forage': 25, 'gem': 1}],
}
CARE = {
    'water':   [{'fish': 3}, {'stone': 8}],
    'farm':    [{'crop': 5}, {'seed': 4}],
    'kitchen': [{'coal': 4}, {'crop': 4, 'fish': 1}],
    'forest':  [{'wood': 10}, {'forage': 3}],
}
CARE_DAYS = 7
GUESTS = 5
GUEST_SLOT = {'day': 3, 'night': 2}

PERSONAS = {
    'heavy': {'minutes': 25, 'play_p': 0.95, 'night_p': 0.8},
    'mid':   {'minutes': 12, 'play_p': 0.85, 'night_p': 0.6},
    'light': {'minutes': 6,  'play_p': 0.65, 'night_p': 0.4},
}


def gather_minutes(need):
    return sum(n / RATE[k] for k, n in need.items() if k in RATE)


def run(persona, seed):
    rnd = random.Random(seed)
    p = PERSONAS[persona]
    stage = {b: 0 for b in BRANCHES}
    care = {b: 0 for b in BRANCHES}
    seen = {b: {'day': set(), 'night': set()} for b in BRANCHES}
    stock = {'charcoal': 0, 'brick': 0, 'gem': 0}
    spent = {b: 0.0 for b in BRANCHES}
    bloom_day = {}
    for day in range(1, 120):
        if rnd.random() < FOG_P:
            stock['gem'] += FOG_GEMS
        if rnd.random() > p['play_p']:
            continue
        budget = p['minutes'] - TRAVEL
        opened = [b for b in BRANCHES if day >= OPEN_DAY[b] and b not in bloom_day]
        for b in opened:
            if care[b] < CARE_DAYS:
                cost = gather_minutes(CARE[b][rnd.randrange(2)]) + 0.2
                if budget >= cost:
                    budget -= cost
                    care[b] += 1
            for phase in ('day', 'night'):
                if phase == 'night' and rnd.random() > p['night_p']:
                    continue
                pool = GUEST_SLOT[phase]
                if len(seen[b][phase]) >= pool or budget < OBSERVE_MIN:
                    continue
                budget -= OBSERVE_MIN
                eligible = rnd.sample(range(pool), k=max(1, pool - 1))
                seen[b][phase].add(rnd.choice(eligible))
        kiln_want = []
        for b in opened:
            if stage[b] >= 3 or budget <= 0:
                continue
            need = STAGES[b][stage[b]]
            short = [k for k, n in need.items() if k in stock and stock[k] < n]
            if any(k in KILN for k in short):
                kiln_want += [k for k in short if k in KILN]
            if short:
                continue
            left = gather_minutes(need) - spent[b]
            use = min(budget, left)
            budget -= use
            spent[b] += use
            if spent[b] >= gather_minutes(need) - 1e-9:
                for k, n in need.items():
                    if k in stock:
                        stock[k] -= n
                stage[b] += 1
                spent[b] = 0.0
        for k in kiln_want[:KILN_SLOTS]:
            cost = gather_minutes(KILN[k])
            if budget >= cost:
                budget -= cost
                stock[k] += KILN_YIELD
        for b in opened:
            guests = len(seen[b]['day']) + len(seen[b]['night'])
            if stage[b] >= 3 and care[b] >= CARE_DAYS and guests >= GUESTS:
                bloom_day[b] = day
        if len(bloom_day) == len(BRANCHES):
            return max(bloom_day.values()), bloom_day
    return None, bloom_day


def main():
    trials = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    total_mat = {}
    for b in BRANCHES:
        for s in STAGES[b]:
            for k, n in s.items():
                total_mat[k] = total_mat.get(k, 0) + n
    print('stage materials total:', total_mat)
    print('stage active minutes (raw gather):', round(sum(gather_minutes(s) for b in BRANCHES for s in STAGES[b]), 1))
    for persona in PERSONAS:
        days, per = [], {b: [] for b in BRANCHES}
        unfinished = 0
        for t in range(trials):
            d, bd = run(persona, t)
            if d is None:
                unfinished += 1
                continue
            days.append(d)
            for b in BRANCHES:
                per[b].append(bd[b])
        if days:
            q = statistics.quantiles(days, n=10)
            print(f"{persona:6s} all-bloom median {statistics.median(days):5.1f}d  p10 {q[0]:5.1f}  p90 {q[-1]:5.1f}  unfinished {unfinished}/{trials}  "
                  + ' '.join(f"{b}:{statistics.median(per[b]):.0f}" for b in BRANCHES))
        else:
            print(f"{persona:6s} never finished in 120 days")


if __name__ == '__main__':
    main()
