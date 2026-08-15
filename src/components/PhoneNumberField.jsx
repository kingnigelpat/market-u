import { useState, useEffect, useRef } from 'react';

const COUNTRIES = [
    ['Nigeria', '234'],
    ['United States / Canada', '1'],
    ['United Kingdom', '44'],
    ['Ghana', '233'],
    ['Kenya', '254'],
    ['South Africa', '27'],
    ['Egypt', '20'],
    ['India', '91'],
    ['Pakistan', '92'],
    ['Bangladesh', '880'],
    ['China', '86'],
    ['Japan', '81'],
    ['South Korea', '82'],
    ['Indonesia', '62'],
    ['Malaysia', '60'],
    ['Philippines', '63'],
    ['Thailand', '66'],
    ['Vietnam', '84'],
    ['Singapore', '65'],
    ['Australia', '61'],
    ['New Zealand', '64'],
    ['Germany', '49'],
    ['France', '33'],
    ['Spain', '34'],
    ['Italy', '39'],
    ['Portugal', '351'],
    ['Netherlands', '31'],
    ['Belgium', '32'],
    ['Switzerland', '41'],
    ['Austria', '43'],
    ['Sweden', '46'],
    ['Norway', '47'],
    ['Denmark', '45'],
    ['Finland', '358'],
    ['Ireland', '353'],
    ['Poland', '48'],
    ['Czech Republic', '420'],
    ['Greece', '30'],
    ['Turkey', '90'],
    ['Russia', '7'],
    ['Ukraine', '380'],
    ['Romania', '40'],
    ['Hungary', '36'],
    ['Israel', '972'],
    ['Saudi Arabia', '966'],
    ['United Arab Emirates', '971'],
    ['Qatar', '974'],
    ['Kuwait', '965'],
    ['Bahrain', '973'],
    ['Oman', '968'],
    ['Jordan', '962'],
    ['Lebanon', '961'],
    ['Iraq', '964'],
    ['Iran', '98'],
    ['Afghanistan', '93'],
    ['Nepal', '977'],
    ['Sri Lanka', '94'],
    ['Myanmar', '95'],
    ['Kazakhstan', '7'],
    ['Uzbekistan', '998'],
    ['Ethiopia', '251'],
    ['Tanzania', '255'],
    ['Uganda', '256'],
    ['Rwanda', '250'],
    ['DR Congo', '243'],
    ['Cameroon', '237'],
    ['Côte d’Ivoire', '225'],
    ['Senegal', '221'],
    ['Morocco', '212'],
    ['Algeria', '213'],
    ['Tunisia', '216'],
    ['Libya', '218'],
    ['Sudan', '249'],
    ['Benin', '229'],
    ['Togo', '228'],
    ['Niger', '227'],
    ['Burkina Faso', '226'],
    ['Mali', '223'],
    ['Zambia', '260'],
    ['Zimbabwe', '263'],
    ['Mozambique', '258'],
    ['Angola', '244'],
    ['Botswana', '267'],
    ['Namibia', '264'],
    ['Malawi', '265'],
    ['Madagascar', '261'],
    ['Somalia', '252'],
    ['Sierra Leone', '232'],
    ['Liberia', '231'],
    ['Guinea', '224'],
    ['Guinea-Bissau', '245'],
    ['Mauritania', '222'],
    ['Chad', '235'],
    ['Central African Republic', '236'],
    ['Gabon', '241'],
    ['Congo', '242'],
    ['Equatorial Guinea', '240'],
    ['Eritrea', '291'],
    ['Djibouti', '253'],
    ['Eswatini', '268'],
    ['Lesotho', '266'],
    ['Mauritius', '230'],
    ['Gambia', '220'],
    ['Cape Verde', '238'],
    ['Seychelles', '248'],
    ['Comoros', '269'],
    ['São Tomé and Príncipe', '239'],
    ['Mexico', '52'],
    ['Brazil', '55'],
    ['Argentina', '54'],
    ['Colombia', '57'],
    ['Chile', '56'],
    ['Peru', '51'],
    ['Venezuela', '58'],
    ['Ecuador', '593'],
    ['Bolivia', '591'],
    ['Paraguay', '595'],
    ['Uruguay', '598'],
    ['Guatemala', '502'],
    ['Honduras', '504'],
    ['El Salvador', '503'],
    ['Nicaragua', '505'],
    ['Costa Rica', '506'],
    ['Panama', '507'],
    ['Cuba', '53'],
    ['Dominican Republic', '1'],
    ['Jamaica', '1'],
    ['Trinidad and Tobago', '1'],
    ['Puerto Rico', '1'],
    ['Haiti', '509'],
    ['Albania', '355'],
    ['Croatia', '385'],
    ['Serbia', '381'],
    ['Bosnia and Herzegovina', '387'],
    ['Slovenia', '386'],
    ['Slovakia', '421'],
    ['Bulgaria', '359'],
    ['North Macedonia', '389'],
    ['Georgia', '995'],
    ['Armenia', '374'],
    ['Azerbaijan', '994'],
    ['Moldova', '373'],
    ['Belarus', '375'],
    ['Lithuania', '370'],
    ['Latvia', '371'],
    ['Estonia', '372'],
];

function parseValue(value) {
    if (!value) return { code: '234', national: '' };
    const digits = String(value).replace(/\D/g, '');
    for (const country of COUNTRIES) {
        const [, c] = country;
        if (c && digits.startsWith(c)) {
            return { code: c, national: digits.slice(c.length) };
        }
    }
    if (digits.startsWith('0')) {
        return { code: '234', national: digits.slice(1) };
    }
    return { code: '234', national: digits };
}

const PhoneNumberField = ({ value = '', onChange, id, inputStyle, placeholder = 'Your number without the country code', onFocus, onBlur }) => {
    const [{ code, national }, setParsed] = useState(() => parseValue(value));
    const lastEmitted = useRef(value);

    const emit = (nextCode, nextNational) => {
        const digits = String(nextNational || '').replace(/\D/g, '');
        const out = nextCode ? `+${nextCode}${digits}` : digits;
        lastEmitted.current = out;
        onChange(out);
    };

    useEffect(() => {
        if (value !== lastEmitted.current) {
            setParsed(parseValue(value));
            lastEmitted.current = value;
        }
    }, [value]);

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <select
                id={id}
                name="phoneCountry"
                value={code}
                onChange={(e) => {
                    setParsed({ code: e.target.value, national });
                    emit(e.target.value, national);
                }}
                aria-label="Country code"
                style={{
                    ...inputStyle,
                    width: '42%',
                    flexShrink: 0,
                    cursor: 'pointer',
                    appearance: 'auto',
                    paddingRight: '0.5rem',
                }}
            >
                {COUNTRIES.map(([name, c]) => (
                    <option key={`${c}-${name}`} value={c}>+{c} {name}</option>
                ))}
            </select>
            <input
                type="tel"
                inputMode="numeric"
                name="phone"
                value={national}
                onChange={(e) => {
                    setParsed({ code, national: e.target.value });
                    emit(code, e.target.value);
                }}
                placeholder={placeholder}
                style={{ ...inputStyle, width: '58%', flexShrink: 1 }}
                onFocus={onFocus}
                onBlur={onBlur}
            />
        </div>
    );
};

export default PhoneNumberField;