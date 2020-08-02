public class ConverterToText {
    public static final String[] units = {
            "", "один", "два", "три", "четыре", "пять", "шесть", "семь",
            "восемь", "девять", "десять", "одинадцать", "двенадцать", "тринадцать", "четырнадцать",
            "пятнадцать", "шестнадцать", "семнадцать", "восемьнадцать", "девятнадцать"
    };

    public static final String[] hungreds = {
            "", "сто", "двесте", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот",
            "восемьсот", "девятьсот"};

    public static final String[] tens = {
            "",        // 0
            "",        // 1
            "двадцать",  // 2
            "тридцать",  // 3
            "сорок",   // 4
            "пятьдесят",   // 5
            "шестьдесят",   // 6
            "семьдесят", // 7
            "восемьдесят",  // 8
            "девяносто"   // 9
    };

    public String convert(final int n) {
        if (n < 0) {
            return "минус " + convert(-n);
        }

        if (n < 20) {
            return units[n];
        }

        if (n < 100) {
            return tens[n / 10]  + " " +units[n % 10];
        }

        if (n < 1000) {
            return hungreds[n / 100] + " " +  convert(n % 100);
        }

        if (n < 20000) {
            if (n < 2000) {
                return units[n / 1000] + " тысяча " +  convert(n % 1000);
            }
            if (n < 4000) {
                return units[n / 1000] + " тысячи " +  convert(n % 1000);
            }
            if (n < 20000) {
                return units[n / 1000] + " тысяч " + convert(n % 1000);
            }}

            if (n < 100000) {
                    return tens[n / 10000] + " " + convert(n % 10000);
                }
            if (n < 1000000) {

                if(n<101000||n>199999&n<201000||n>299999&n<301000||n>399999&n<401000||n>499999&n<501000||n>599999&n<601000
                        ||n>699999&n<701000||n>799999&n<801000||n>899999&n<901000){

                    return hungreds[n / 100000] + " тысяч"  + convert(n % 100000);
                }
                else{
                    return hungreds[n / 100000] + " " + convert(n % 100000);
                }}



            if (n < 1000000000) {
                return convert(n / 1000000) + " миллион "  + convert(n % 1000000);
            }

            return convert(n / 1000000000) + " миллиард" + convert(n % 1000000000);
        }

    }
